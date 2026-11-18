// Offline checks for registered content. Browser behavior remains covered by check.js.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const coverage = JSON.parse(fs.readFileSync(path.join(__dirname, "coverage.json"), "utf8"));
const errata = JSON.parse(fs.readFileSync(path.join(__dirname, "errata.json"), "utf8"));
const lessons = [];
const context = vm.createContext({
  COURSE: {
    addLesson(lesson) {
      lessons.push(lesson);
    },
  },
});
const scripts = [...index.matchAll(/<script src="(js\/lessons\/[^" ]+\.js)"><\/script>/g)];
for (const [, relative] of scripts) {
  const filename = path.join(root, relative);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename, timeout: 1000 });
}
// Перевіряємо те, що зареєстровано в index.html: курс можна добудовувати по одному параграфу.
assert(scripts.length > 0, "index.html must register lesson scripts");
assert.equal(lessons.length, scripts.length, "each lesson script must register one page");
const onDisk = fs.readdirSync(path.join(root, "js", "lessons")).filter((name) => name.endsWith(".js"));
const registered = new Set(scripts.map(([, relative]) => path.basename(relative)));
for (const name of onDisk) assert(registered.has(name), "lesson file not registered in index.html: " + name);
const pages = new Map();
const kinds = ["quiz", "multi", "order", "input"];
const sidebars = ["cherkasy", "ukraine", "potter", "horse", "life", "game"];
// `onepiece` — наскрізна врізка-місток до аніме, не обов’язкова (на відміну від шести sidebars).
const supported = new Set(["text", "note", "errata", "image", "gallery", "terms", "summary", "fold", "onepiece", ...sidebars, ...kinds]);
let questions = 0;
let images = 0;
const missingContent = [];
for (const lesson of lessons) {
  assert(!pages.has(lesson.id), "duplicate page ID: " + lesson.id);
  pages.set(lesson.id, lesson);
  assert(lesson.title && lesson.group && lesson.subtitle, lesson.id + ": missing page metadata");
  const ids = new Set();
  const present = new Set();
  let count = 0;
  let text = lesson.title + " " + lesson.subtitle + " " + (lesson.goals || []).join(" ");
  for (const block of lesson.blocks) {
    assert(supported.has(block.type), lesson.id + ": unsupported block " + block.type);
    text += " " + [block.title, block.html, block.question, block.caption, ...(block.options || [])].filter(Boolean).join(" ");
    if (block.type === "terms") {
      for (const item of block.items) text += " " + [item.t, item.d, item.book].filter(Boolean).join(" ");
    }
    if (block.type === "gallery") {
      for (const item of block.items) text += " " + (item.caption || "");
    }
    if (block.type === "errata") text += " " + [block.book, block.truth, block.say].filter(Boolean).join(" ");
    if (block.type === "order") text += " " + block.items.join(" ");
    if (kinds.includes(block.type)) {
      assert(block.id && !ids.has(block.id), lesson.id + ": missing/duplicate question ID");
      ids.add(block.id);
      present.add(block.type);
      assert(block.question && block.explain, lesson.id + "/" + block.id + ": missing question or explanation");
      if (block.type === "quiz" || block.type === "multi") {
        assert(block.options.length >= 2 && block.options.length <= 6, lesson.id + ": invalid options");
        const answers = block.type === "quiz" ? [block.answer] : block.answers;
        assert(answers.length && new Set(answers).size === answers.length, lesson.id + ": invalid answer set");
        for (const answer of answers) assert(Number.isInteger(answer) && answer >= 0 && answer < block.options.length, lesson.id + ": answer outside options");
      }
      if (block.type === "input") assert(block.accept.length && block.accept.every((value) => typeof value === "string" && value.trim()), lesson.id + ": empty accepted answer");
      if (block.type === "order") assert(block.items.length >= 2 && new Set(block.items).size === block.items.length, lesson.id + ": invalid ordering items");
      count++;
      questions++;
    }
    if (block.type === "image" || block.type === "gallery") {
      const figures = block.type === "image" ? [block] : block.items;
      for (const figure of figures) {
        assert(figure.caption && figure.alt, lesson.id + ": image needs caption and alt text");
        const imagePath = path.resolve(root, "img", figure.src);
        assert(imagePath.startsWith(path.join(root, "img") + path.sep), "image path escapes img/");
        assert(fs.existsSync(imagePath), lesson.id + ": missing image " + figure.src);
        const bytes = fs.readFileSync(imagePath);
        assert(bytes[0] === 0xff && bytes[1] === 0xd8, lesson.id + ": expected JPEG " + figure.src);
        images++;
      }
    }
  }
  assert.equal(present.size, 4, lesson.id + ": needs all four question types");
  if (lesson.exam) {
    assert.equal(count, 12, lesson.id + ": assessment must have 12 questions");
  } else {
    assert(count >= 6 && count <= 8, lesson.id + ": paragraph must have 6–8 questions");
    for (const kind of sidebars) assert.equal(lesson.blocks.filter((block) => block.type === kind).length, 1, lesson.id + ": needs one " + kind + " block");
    const life = lesson.blocks.find((block) => block.type === "life");
    assert((life.html.match(/<li\b/g) || []).length >= 3, lesson.id + ": needs three everyday examples");
    assert(Array.isArray(coverage[lesson.id]) && coverage[lesson.id].length > 10, lesson.id + ": missing required-content list");
    text = text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").toLowerCase();
    for (const needle of coverage[lesson.id]) {
      if (!text.includes(needle)) missingContent.push(lesson.id + ": " + needle);
    }
  }
  assert(lesson.blocks.filter((block) => block.type === "errata").length >= (errata[lesson.id] || []).length, lesson.id + ": missing textbook correction");
}
for (const lesson of lessons) {
  if (lesson.id.startsWith("test")) assert(lesson.exam, lesson.id + ": assessment must have exam: true");
}
assert.equal(missingContent.length, 0, "missing required content:\n" + missingContent.join("\n"));
console.log("Content OK: " + lessons.filter((l) => !l.exam).length + " paragraphs, " + lessons.filter((l) => l.exam).length + " assessments, " + questions + " questions, " + images + " image references.");
