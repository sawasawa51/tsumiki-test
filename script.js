const SUPABASE_URL = "https://qeheodmrjbarajwkwlmi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZFerPQIhZEyNSV_AK8Kryg_bWBs_UeT";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPABASE_BUCKET = "tsumiki-ipad";
const TRANSFORM_FUNCTION_NAME = "rapid-function";

const state = {
numberInput: "",
entryId: "",
photoFile: "",
aiFile: "",
printFile: "",
photoBlob: null,
printBlob: null,
printSignedUrl: "",
q1: null,
q2: null,
q3: null,
showingBefore: false,
regenerateRemaining: 3,
aiCandidates: [],
currentAiCandidateIndex: 0,
regenerateMode: false
};

const promptTables = {
q1: {},
q2: {},
q3: {}
};

let cardsA = [];
let cardsB = [];
let cardsC = [];

let buildGuideSlideIndex = 0;
let buildGuideTimer = null;
let csvLoaded = false;
let csvLoadError = "";

/* ==================================================
iPad高さ対策
================================================== */
function updateAppHeight() {
const height = window.innerHeight || document.documentElement.clientHeight;
document.documentElement.style.setProperty("--app-height", `${height}px`);
}

window.addEventListener("resize", updateAppHeight);
window.addEventListener("orientationchange", () => {
setTimeout(updateAppHeight, 100);
setTimeout(updateAppHeight, 300);
setTimeout(updateAppHeight, 700);
});

updateAppHeight();

/* ==================================================
Fullscreen
================================================== */
async function enterFullscreen() {
const element = document.documentElement;

try {
if (!document.fullscreenElement && element.requestFullscreen) {
await element.requestFullscreen();
}
} catch (error) {
console.log("Fullscreen is not available:", error);
}
}

async function startApp() {
await enterFullscreen();
updateAppHeight();
goToPage("page-howto");
}

/* ==================================================
Navigation
================================================== */
function goToPage(pageId) {
updateAppHeight();

document.querySelectorAll(".page").forEach(page => {
page.classList.remove("active");
});

const nextPage = document.getElementById(pageId);
if (!nextPage) return;

nextPage.classList.add("active");

if (pageId === "page-start") {
document.body.classList.add("is-start");
} else {
document.body.classList.remove("is-start");
}

if (pageId === "page-number") {
document.body.classList.add("is-number");
} else {
document.body.classList.remove("is-number");
}

if (pageId === "page-confirm") {
setSubmitStatus("");
}

if (pageId === "page-build-guide") {
startBuildGuideSlides();
} else {
stopBuildGuideSlides();
}

if (pageId === "page-card-a") {
const scrollA = document.getElementById("cardScrollA");
if (scrollA) scrollA.scrollLeft = 0;
}

if (pageId === "page-card-a" || pageId === "page-card-b" || pageId === "page-card-c") {
setTimeout(updateCardPageArrows, 50);
}
}

/* ==================================================
積み木ガイド：自動スライド
================================================== */
function startBuildGuideSlides() {
buildGuideSlideIndex = 0;
showBuildGuideSlide(buildGuideSlideIndex);

stopBuildGuideSlides();

buildGuideTimer = setInterval(() => {
buildGuideSlideIndex = (buildGuideSlideIndex + 1) % 3;
showBuildGuideSlide(buildGuideSlideIndex);
}, 5000);
}

function stopBuildGuideSlides() {
if (buildGuideTimer) {
clearInterval(buildGuideTimer);
buildGuideTimer = null;
}
}

function showBuildGuideSlide(index) {
const slides = document.querySelectorAll(".build-guide-slide");
const dots = document.querySelectorAll(".build-guide-dot");

slides.forEach((slide, slideIndex) => {
if (slideIndex === index) {
slide.classList.add("active");
} else {
slide.classList.remove("active");
}
});

dots.forEach((dot, dotIndex) => {
if (dotIndex === index) {
dot.classList.add("active");
} else {
dot.classList.remove("active");
}
});
}

/* ==================================================
整理番号
================================================== */
function inputNumber(num) {
if (state.numberInput.length >= 3) return;

state.numberInput += num;
hideNumberMessage();
updateNumberDisplay();
}

function backspaceNumber() {
state.numberInput = state.numberInput.slice(0, -1);
hideNumberMessage();
updateNumberDisplay();
}

function updateNumberDisplay() {
const display = document.getElementById("numberDisplay");
const nextButton = document.getElementById("numberNextButton");
const enterKeyButton = document.getElementById("enterKeyButton");

const digits = state.numberInput.split("");

if (display) {
display.innerHTML = [0, 1, 2]
.map(index => {
const digit = digits[index];

if (!digit) {
return `<span class="number-digit number-digit-empty"></span>`;
}

return `<span class="number-digit"><span class="display-number-digit display-number-digit-${digit}">${digit}</span></span>`;
})
.join("");
}

if (nextButton) {
nextButton.disabled = state.numberInput.length !== 3;
}

if (enterKeyButton) {
if (state.numberInput.length === 3) {
enterKeyButton.classList.add("enter-ready");
} else {
enterKeyButton.classList.remove("enter-ready");
}
}
}

function tryConfirmNumber() {
if (state.numberInput.length !== 3) {
showNumberMessage("3けた入れてから ↵ をおしてね");
shakeNumberDisplay();
return;
}

confirmNumber();
}

function showNumberMessage(message) {
const numberMessage = document.getElementById("numberMessage");

if (!numberMessage) return;

numberMessage.textContent = message;
numberMessage.classList.add("show");
}

function hideNumberMessage() {
const numberMessage = document.getElementById("numberMessage");

if (!numberMessage) return;

numberMessage.classList.remove("show");
}

function shakeNumberDisplay() {
const display = document.getElementById("numberDisplay");

if (!display) return;

display.classList.remove("shake");
void display.offsetWidth;
display.classList.add("shake");
}

function confirmNumber() {
if (state.numberInput.length !== 3) return;

state.entryId = state.numberInput.padStart(3, "0");
state.photoFile = `${state.entryId}.jpg`;
state.aiFile = `${state.entryId}_ai.jpg`;
state.printFile = `${state.entryId}_pr.jpg`;

goToPage("page-build-guide");
}

/* ==================================================
写真フロー
================================================== */
function openCamera() {
const cameraInput = document.getElementById("cameraInput");
if (cameraInput) {
cameraInput.click();
}
}

document.getElementById("cameraInput").addEventListener("change", async event => {
const file = event.target.files[0];
if (!file) return;

const finalPhotoBlob = await preparePhoto(file);

setCapturedPhoto(finalPhotoBlob);

event.target.value = "";

goToPage("page-photo-confirm");
});

function setCapturedPhoto(blob) {
state.photoBlob = blob;
state.photoFile = `${state.entryId}.jpg`;
state.aiFile = `${state.entryId}_ai.jpg`;
state.printFile = `${state.entryId}_pr.jpg`;

const preview = document.getElementById("photoPreview");

if (preview) {
preview.src = URL.createObjectURL(blob);
preview.style.display = "block";
}

const retakeButton = document.getElementById("retakeButton");
const photoNextButton = document.getElementById("photoNextButton");

if (retakeButton) retakeButton.disabled = false;
if (photoNextButton) photoNextButton.disabled = false;
}

async function preparePhoto(file) {
const imageInfo = await getImageSize(file);

if (imageInfo.width === imageInfo.height) {
return file;
}

return await cropImageToSquare(file);
}

function getImageSize(file) {
return new Promise((resolve, reject) => {
const img = new Image();
const url = URL.createObjectURL(file);

img.onload = () => {
const width = img.naturalWidth;
const height = img.naturalHeight;
URL.revokeObjectURL(url);
resolve({ width, height });
};

img.onerror = error => {
URL.revokeObjectURL(url);
reject(error);
};

img.src = url;
});
}

function cropImageToSquare(file) {
return new Promise((resolve, reject) => {
const img = new Image();
const url = URL.createObjectURL(file);

img.onload = () => {
const size = Math.min(img.naturalWidth, img.naturalHeight);
const sx = (img.naturalWidth - size) / 2;
const sy = (img.naturalHeight - size) / 2;

const canvas = document.createElement("canvas");
const outputSize = 1024;
canvas.width = outputSize;
canvas.height = outputSize;

const ctx = canvas.getContext("2d");
ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);

canvas.toBlob(
blob => {
URL.revokeObjectURL(url);
resolve(blob);
},
"image/jpeg",
0.92
);
};

img.onerror = error => {
URL.revokeObjectURL(url);
reject(error);
};

img.src = url;
});
}

/* ==================================================
CSV
================================================== */
async function loadPromptCsvFiles() {
const allCards = await loadPromptCsv("select_card.csv");

promptTables.q1 = {};
promptTables.q2 = {};
promptTables.q3 = {};

Object.keys(allCards).forEach(cardId => {
if (cardId.startsWith("A-")) {
promptTables.q1[cardId] = allCards[cardId];
}

if (cardId.startsWith("B-")) {
promptTables.q2[cardId] = allCards[cardId];
}

if (cardId.startsWith("C-")) {
promptTables.q3[cardId] = allCards[cardId];
}
});
}

async function loadPromptCsv(filePath) {
const cacheBuster = `v=${Date.now()}`;
const url = filePath.includes("?")
? `${filePath}&${cacheBuster}`
: `${filePath}?${cacheBuster}`;

const response = await fetch(url, { cache: "no-store" });

if (!response.ok) {
throw new Error(`${filePath} を読み込めませんでした`);
}

const buffer = await response.arrayBuffer();

let text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

text = text.replace(/^\uFEFF/, "");

const firstLine = text.split(/\r?\n/)[0] || "";
const looksBroken =
firstLine.includes("ï»¿") ||
text.includes("蟄") ||
text.includes("譬") ||
text.includes("縺") ||
text.includes("荳") ||
text.includes("蜷");

if (looksBroken) {
try {
const sjisText = new TextDecoder("shift_jis", { fatal: false }).decode(buffer);

if (sjisText) {
text = sjisText.replace(/^\uFEFF/, "");
console.log("CSVをShift-JISとして読み直しました");
}
} catch (error) {
console.warn("Shift-JISとしての読み直しに失敗しました", error);
}
}

return parsePromptCsv(text);
}

function detectDelimiter(csvText) {
const firstLine = String(csvText || "").split(/\r?\n/)[0] || "";

const commaCount = (firstLine.match(/,/g) || []).length;
const tabCount = (firstLine.match(/\t/g) || []).length;
const semicolonCount = (firstLine.match(/;/g) || []).length;

if (tabCount > commaCount && tabCount >= semicolonCount) {
return "\t";
}

if (semicolonCount > commaCount && semicolonCount > tabCount) {
return ";";
}

return ",";
}

function normalizeCardId(value) {
return String(value || "")
.trim()
.replace(/^\uFEFF/, "")
.replace(/[Ａ-Ｚａ-ｚ０-９]/g, char =>
String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
)
.replace(/[‐‑‒–—―ー－]/g, "-")
.toUpperCase();
}

function normalizeHeader(value) {
return String(value || "")
.trim()
.replace(/^\uFEFF/, "")
.replace(/^ï»¿/, "")
.replace(/^ ｿ/, "")
.toLowerCase();
}

function parsePromptCsv(csvText) {
const rows = parseCsv(csvText);
if (rows.length <= 1) return {};

const headers = rows[0].map(header => normalizeHeader(header));

const numberIndex = headers.indexOf("number");
const nameIndex = headers.indexOf("name");
const promptIndex = headers.indexOf("prompt");
const imageIndex = headers.indexOf("image");
const enabledIndex = headers.indexOf("enabled");

if (numberIndex === -1) {
console.error("CSVに number ヘッダーがありません", headers);
}

if (nameIndex === -1) {
console.error("CSVに name ヘッダーがありません", headers);
}

if (promptIndex === -1) {
console.warn("CSVに prompt ヘッダーがありません", headers);
}

const map = {};

rows.slice(1).forEach(cols => {
const number = numberIndex >= 0 ? normalizeCardId(cols[numberIndex]) : "";
if (!number) return;

const name = nameIndex >= 0 ? String(cols[nameIndex] || "").trim() : "";

const enabled =
enabledIndex === -1
? true
: String(cols[enabledIndex] || "true").trim().toLowerCase() !== "false";

if (!enabled) return;

map[number] = {
number,
name,
label: name,
prompt: promptIndex >= 0 ? String(cols[promptIndex] || "").trim() : "",
image: imageIndex >= 0 ? String(cols[imageIndex] || "").trim() : ""
};
});

console.log("CSV headers:", headers);
console.log("parsed card count:", Object.keys(map).length);
console.log("sample A-01:", map["A-01"]);

return map;
}

function parseCsv(csvText) {
const delimiter = detectDelimiter(csvText);

const rows = [];
let row = [];
let value = "";
let inQuotes = false;

for (let i = 0; i < csvText.length; i++) {
const char = csvText[i];
const nextChar = csvText[i + 1];

if (char === "\"" && inQuotes && nextChar === "\"") {
value += "\"";
i++;
continue;
}

if (char === "\"") {
inQuotes = !inQuotes;
continue;
}

if (char === delimiter && !inQuotes) {
row.push(value);
value = "";
continue;
}

if ((char === "\n" || char === "\r") && !inQuotes) {
if (char === "\r" && nextChar === "\n") {
i++;
}

row.push(value);
value = "";

if (row.some(cell => String(cell || "").trim() !== "")) {
rows.push(row);
}

row = [];
continue;
}

value += char;
}

row.push(value);

if (row.some(cell => String(cell || "").trim() !== "")) {
rows.push(row);
}

console.log("CSV delimiter:", delimiter === "\t" ? "TAB" : delimiter);
console.log("CSV headers raw:", rows[0]);
console.log("CSV first data row:", rows[1]);

return rows;
}

function getPromptRecord(cardId) {
const normalizedCardId = normalizeCardId(cardId);

if (!normalizedCardId) return null;

if (normalizedCardId.startsWith("A-")) {
return promptTables.q1[normalizedCardId] || null;
}

if (normalizedCardId.startsWith("B-")) {
return promptTables.q2[normalizedCardId] || null;
}

if (normalizedCardId.startsWith("C-")) {
return promptTables.q3[normalizedCardId] || null;
}

return null;
}

function getCardPromptFromCsv(cardId) {
const record = getPromptRecord(cardId);
return record && record.prompt ? record.prompt : "";
}

function getCardLabelFromCsv(cardId) {
const record = getPromptRecord(cardId);

if (record && record.name) {
return record.name;
}

if (record && record.label) {
return record.label;
}

return "";
}

/* ==================================================
カード
================================================== */
function createCardsFromPrefix(prefix, count) {
return Array.from({ length: count }, (_, index) => {
const number = String(index + 1).padStart(2, "0");
const id = `${prefix}-${number}`;

return {
id,
label: getCardLabel(id),
image: getCardImage(id)
};
});
}

function getCardImage(cardId) {
const record = getPromptRecord(cardId);

if (record && record.image) {
return record.image;
}

return `assets/cards/${cardId}.jpg`;
}

function getSupabasePublicUrl(path) {
const { data } = supabaseClient.storage
.from(SUPABASE_BUCKET)
.getPublicUrl(path);

return data.publicUrl;
}

function renderCardGroups(containerId, cards, type) {
const container = document.getElementById(containerId);
container.innerHTML = "";

const groupSize = 15;

for (let i = 0; i < cards.length; i += groupSize) {
const group = document.createElement("div");
group.className = "card-group";

const groupCards = cards.slice(i, i + groupSize);

groupCards.forEach(card => {
const displayLabel = getCardLabel(card.id);
const image = getCardImage(card.id);

const button = document.createElement("button");
button.className = "card";
button.dataset.cardId = card.id;
button.onclick = () => selectCard(type, card.id);

button.innerHTML = `<div class="card-image"><img src="${image}" alt="${displayLabel}" onerror="this.style.display='none'; this.parentElement.textContent='${card.id}';"></div><div class="card-label">${displayLabel}</div>`;

group.appendChild(button);
});

container.appendChild(group);
}
}

function findCardById(cardId) {
const allCards = [...cardsA, ...cardsB, ...cardsC];
return allCards.find(card => card.id === cardId);
}

function getCardLabel(cardId) {
const csvLabel = getCardLabelFromCsv(cardId);
if (csvLabel) return csvLabel;

if (!csvLoaded) {
return "CSV未読込";
}

return cardId;
}

/* ==================================================
カード選択
================================================== */
function selectCard(type, cardId) {
if (type === "A") {
state.q1 = state.q1 === cardId ? null : cardId;
updateCardNextButton("A");
}

if (type === "B") {
state.q2 = state.q2 === cardId ? null : cardId;
updateCardNextButton("B");
}

if (type === "C") {
state.q3 = state.q3 === cardId ? null : cardId;
updateCardNextButton("C");
}

updateCardSelectionVisuals();
showSelectedCardFocus(type);
}

function getSelectedCardIdByType(type) {
if (type === "A") return state.q1;
if (type === "B") return state.q2;
if (type === "C") return state.q3;
return null;
}

function updateCardNextButton(type) {
const selectedId = getSelectedCardIdByType(type);
const button = document.getElementById(`card${type}NextButton`);
if (!button) return;
button.disabled = !selectedId;
button.classList.toggle("show-next", !!selectedId);
}

function showSelectedCardFocus(type) {
const selectedId = getSelectedCardIdByType(type);
const page = document.getElementById(`page-card-${type.toLowerCase()}`);
const scroll = document.getElementById(`cardScroll${type}`);
if (!page || !scroll) return;

const oldFocus = page.querySelector(".selected-card-focus");
if (oldFocus) oldFocus.remove();

if (!selectedId) {
page.classList.remove("is-card-focused");
return;
}

const label = getCardLabel(selectedId);
const image = getCardImage(selectedId);
const focus = document.createElement("div");
focus.className = "selected-card-focus";
focus.innerHTML = `
  <div class="selected-card-focus-card">
    <div class="selected-card-focus-image"><img src="${image}" alt="${label}" onerror="this.style.display='none'; this.parentElement.textContent='${selectedId}';"></div>
    <div class="selected-card-focus-label">${label}</div>
  </div>
  <div class="selected-card-focus-note">このカードでいいかな？</div>
  <button type="button" class="selected-card-change-button" onclick="reopenCardGrid('${type}')">えらびなおす</button>
`;
scroll.parentElement.appendChild(focus);
page.classList.add("is-card-focused");
}

function reopenCardGrid(type) {
const page = document.getElementById(`page-card-${type.toLowerCase()}`);
if (!page) return;
page.classList.remove("is-card-focused");
setTimeout(updateCardPageArrows, 50);
}

function updateCardSelectionVisuals() {
document.querySelectorAll(".card").forEach(card => {
const cardId = card.dataset.cardId;

if (getAllSelectedCards().includes(cardId)) {
card.classList.add("selected");
} else {
card.classList.remove("selected");
}
});

updateCardPageArrows();
}

function resetCardScrollPositions() {
["cardScrollA", "cardScrollB", "cardScrollC"].forEach(scrollId => {
const scroll = document.getElementById(scrollId);
if (scroll) scroll.scrollLeft = 0;
});

updateCardPageArrows();
}

function updateCardPageArrows() {
const currentPage = document.querySelector(".page.active");
const currentPageId = currentPage ? currentPage.id : "";

const arrowLeftA = document.getElementById("cardArrowLeftA");
const arrowRightA = document.getElementById("cardArrowRightA");
const arrowLeftB = document.getElementById("cardArrowLeftB");
const arrowRightB = document.getElementById("cardArrowRightB");
const arrowLeftC = document.getElementById("cardArrowLeftC");
const arrowRightC = document.getElementById("cardArrowRightC");

const scrollA = document.getElementById("cardScrollA");
const scrollB = document.getElementById("cardScrollB");
const scrollC = document.getElementById("cardScrollC");

function isRightPage(scroll) {
if (!scroll || !scroll.clientWidth) return false;
return scroll.scrollLeft > scroll.clientWidth * 0.45;
}

function setArrow(leftArrow, rightArrow, scroll, isCurrentPage) {
if (!leftArrow || !rightArrow) return;

if (!isCurrentPage) {
leftArrow.classList.remove("show");
rightArrow.classList.remove("show");
return;
}

if (isRightPage(scroll)) {
leftArrow.classList.add("show");
rightArrow.classList.remove("show");
} else {
leftArrow.classList.remove("show");
rightArrow.classList.add("show");
}
}

setArrow(arrowLeftA, arrowRightA, scrollA, currentPageId === "page-card-a");
setArrow(arrowLeftB, arrowRightB, scrollB, currentPageId === "page-card-b");
setArrow(arrowLeftC, arrowRightC, scrollC, currentPageId === "page-card-c");
}

function setupCardScrollArrowListeners() {
["cardScrollA", "cardScrollB", "cardScrollC"].forEach(scrollId => {
const scroll = document.getElementById(scrollId);

if (!scroll) return;

scroll.addEventListener("scroll", () => {
updateCardPageArrows();
});

scroll.addEventListener("touchend", () => {
setTimeout(updateCardPageArrows, 80);
});

scroll.addEventListener("mouseup", () => {
setTimeout(updateCardPageArrows, 80);
});
});
}

function getAllSelectedCards() {
return [state.q1, state.q2, state.q3].filter(Boolean);
}

function updateStockBars() {
}

function restartCardSelection() {
state.q1 = null;
state.q2 = null;
state.q3 = null;

const cardANextButton = document.getElementById("cardANextButton");
const cardBNextButton = document.getElementById("cardBNextButton");
const cardCNextButton = document.getElementById("cardCNextButton");

if (cardANextButton) {
cardANextButton.disabled = true;
cardANextButton.classList.remove("show-next");
}

if (cardBNextButton) {
cardBNextButton.disabled = true;
cardBNextButton.classList.remove("show-next");
}

if (cardCNextButton) {
cardCNextButton.disabled = true;
cardCNextButton.classList.remove("show-next");
}

updateStockBars();
["A", "B", "C"].forEach(type => { const page = document.getElementById(`page-card-${type.toLowerCase()}`); if (page) page.classList.remove("is-card-focused"); });
resetCardScrollPositions();
updateCardSelectionVisuals();

goToPage("page-card-a");
}

/* ==================================================
確認
================================================== */
function showConfirmPage() {
const q1Card = state.q1 ? findCardById(state.q1) : null;
const q2Card = state.q2 ? findCardById(state.q2) : null;
const q3Card = state.q3 ? findCardById(state.q3) : null;

const photoImageBox = document.getElementById("confirmPhotoImageBox");
const photoImage = document.getElementById("confirmPhotoImage");

if (photoImageBox && photoImage && state.photoBlob) {
photoImage.src = URL.createObjectURL(state.photoBlob);
photoImageBox.classList.add("has-image");
}

setConfirmCard("Q1", q1Card);
setConfirmCard("Q2", q2Card);
setConfirmCard("Q3", q3Card);

goToPage("page-confirm");
}


function setConfirmCard(type, card) {
const title = document.getElementById(`confirm${type}Title`);
const box = document.getElementById(`confirm${type}ImageBox`);
const img = document.getElementById(`confirm${type}Image`);

if (!title || !box || !img) return;

if (!card) {
title.textContent = "---";
box.classList.remove("has-image");
img.removeAttribute("src");
return;
}

const label = getCardLabel(card.id);
const image = getCardImage(card.id);

title.textContent = label;
box.classList.add("has-image");
img.src = image;
img.alt = label;
}

/* ==================================================
Prompt
================================================== */
function buildAiPrompt() {
const q1Prompt = getCardPromptFromCsv(state.q1);
const q3Prompt = getCardPromptFromCsv(state.q3);

const q1Label = getCardLabel(state.q1);
const q2Label = getCardLabel(state.q2);
const q3Label = getCardLabel(state.q3);

const q2Instruction = state.q2
? `Use the visual impression of the Q2 reference image selected by the user, titled "${q2Label}", as inspiration for the architectural exterior design.`
: "";

return `Reinterpret the child's wooden block model in the input image as a futuristic architectural building, while preserving the original camera angle, composition, and viewpoint.

Selected cards:
- Q1: ${q1Label || ""}
- Q2: ${q2Label || ""}
- Q3: ${q3Label || ""}

Q1 design concept:
${q1Prompt || "Naturally reflect the meaning of the selected Q1 card in the architectural design."}

Q2 reference image instruction:
${q2Instruction}

Q3 design concept:
${q3Prompt || "Naturally reflect the atmosphere of the selected Q3 card in the architectural design."}

Requirements:
- Do not change the original camera angle, composition, or viewpoint.
- Preserve the shape, silhouette, stacking structure, and volume of the wooden blocks.
- Reflect the Q1 and Q3 prompt contents in the architectural design.
- Use the selected Q2 reference image as inspiration for the building's exterior design.
- Transform the child's wooden block creation into a futuristic architectural concept.
- Make the result bright, playful, imaginative, and dreamlike.
- Do not include people.
- Do not include text, logos, signs, captions, labels, or watermarks.
- Square image.`.trim();
}

function getReferenceImages() {
if (!state.q2) return [];

return [
{
type: "q2_card",
card_id: state.q2,
bucket: SUPABASE_BUCKET,
path: `cards/${state.q2}.jpg`,
instruction: "Use this image as visual inspiration for the building exterior design."
}
];
}

/* ==================================================
Supabase
================================================== */
function setSubmitStatus(message) {
const status = document.getElementById("submitStatus");
if (status) status.textContent = message;
}

function setSubmitButtonDisabled(disabled) {
const button = document.getElementById("submitButton");
if (button) button.disabled = disabled;
}

async function uploadPhotoToSupabase() {
if (!state.photoBlob) throw new Error("写真がありません");

const photoPath = `photos/${state.photoFile}`;

const { data, error } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.upload(photoPath, state.photoBlob, {
contentType: "image/jpeg",
upsert: true
});

if (error) throw error;

return data;
}

function getAiCandidateFileName(index) {
return `${state.entryId}_ai_${index}.jpg`;
}

function getCurrentAiCandidateFileName() {
return state.aiCandidates[state.currentAiCandidateIndex] || "";
}

async function generateAiImage(candidateIndex) {
const prompt = buildAiPrompt();
const candidateFile = getAiCandidateFileName(candidateIndex);

const { data, error } = await supabaseClient.functions.invoke(TRANSFORM_FUNCTION_NAME, {
body: {
photo_path: `photos/${state.photoFile}`,
output_path: `outputs/${candidateFile}`,
prompt,
reference_images: getReferenceImages()
}
});

if (error) {
throw error;
}

if (!data || data.ok === false) {
throw new Error(data?.error || "画像生成に失敗しました");
}

if (!state.aiCandidates.includes(candidateFile)) {
state.aiCandidates.push(candidateFile);
}

state.currentAiCandidateIndex = state.aiCandidates.indexOf(candidateFile);

return {
...data,
candidateFile
};
}

function renderResultSelectedCards() {
const container = document.getElementById("resultSelectedCards");
if (!container) return;

const selected = [state.q1, state.q2, state.q3].filter(Boolean);
if (!selected.length) {
container.innerHTML = "";
container.style.display = "none";
return;
}

container.innerHTML = selected.map(cardId => {
const label = getCardLabel(cardId);
const image = getCardImage(cardId);
return `<div class="result-selected-card"><img src="${image}" alt="${label}" onerror="this.style.display='none';"><span>${label}</span></div>`;
}).join("");
container.style.display = "grid";
}

function startRegenerateCardSelection() {
if (state.aiCandidates.length >= 3) {
updateRegenerateCountText();
return;
}

state.regenerateMode = true;
["A", "B", "C"].forEach(type => {
const page = document.getElementById(`page-card-${type.toLowerCase()}`);
if (page) page.classList.remove("is-card-focused");
});
resetCardScrollPositions();
goToPage("page-card-a");
}

function setupGeneratingScreen() {
const resultCenterMessage = document.getElementById("resultCenterMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");
const completeTitle = document.getElementById("completeTitle");
const completeMessage = document.getElementById("completeMessage");
const generatingIcon = document.getElementById("generatingIcon");
const regenerateButton = document.getElementById("regenerateButton");
const regenerateCountText = document.getElementById("regenerateCountText");
const completeResetButton = document.getElementById("completeResetButton");
const goPrintButton = document.getElementById("goPrintButton");
const aiPreview = document.getElementById("aiPreview");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const beforePreview = document.getElementById("beforePreview");
const beforeAfterToggle = document.getElementById("beforeAfterToggle");
const beforeAfterToggleLabel = document.getElementById("beforeAfterToggleLabel");
const resultSideLogo = document.getElementById("resultSideLogo");
const aiPrevVersionButton = document.getElementById("aiPrevVersionButton");
const aiNextVersionButton = document.getElementById("aiNextVersionButton");
const resultSelectedCards = document.getElementById("resultSelectedCards");

if (resultCenterMessage) resultCenterMessage.style.display = "flex";
if (resultCenterIcon) resultCenterIcon.textContent = "";

if (aiPlaceholder) {
aiPlaceholder.textContent = "つみきがへんしん中";
aiPlaceholder.style.display = "block";
}

if (completeTitle) completeTitle.textContent = "";
if (completeMessage) completeMessage.textContent = "";

if (generatingIcon) generatingIcon.style.display = "block";

if (regenerateButton) {
regenerateButton.style.display = "none";
regenerateButton.disabled = false;
}

if (regenerateCountText) regenerateCountText.style.display = "none";

if (completeResetButton) completeResetButton.style.display = "none";
if (goPrintButton) goPrintButton.style.display = "none";

if (resultSelectedCards) {
resultSelectedCards.innerHTML = "";
resultSelectedCards.style.display = "none";
}

if (resultSideLogo) {
resultSideLogo.style.display = "block";
resultSideLogo.style.width = "420px";
resultSideLogo.style.maxWidth = "100%";
}

if (aiPreview) {
aiPreview.removeAttribute("src");
aiPreview.style.display = "none";
}

state.showingBefore = false;

if (beforePreview) {
beforePreview.removeAttribute("src");
beforePreview.style.display = "none";
}

if (beforeAfterToggle) {
beforeAfterToggle.style.display = "none";
beforeAfterToggle.classList.remove("show-before");
}

if (beforeAfterToggleLabel) {
beforeAfterToggleLabel.textContent = "つみき";
}

if (aiPrevVersionButton) aiPrevVersionButton.style.display = "none";
if (aiNextVersionButton) aiNextVersionButton.style.display = "none";
}

function setupGeneratedScreen() {
const resultCenterMessage = document.getElementById("resultCenterMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");
const completeTitle = document.getElementById("completeTitle");
const completeMessage = document.getElementById("completeMessage");
const generatingIcon = document.getElementById("generatingIcon");
const regenerateButton = document.getElementById("regenerateButton");
const completeResetButton = document.getElementById("completeResetButton");
const goPrintButton = document.getElementById("goPrintButton");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const resultSideLogo = document.getElementById("resultSideLogo");

if (resultCenterMessage) resultCenterMessage.style.display = "flex";
if (resultCenterIcon) resultCenterIcon.textContent = "🎉";

if (aiPlaceholder) {
aiPlaceholder.innerHTML = "へんしん<br>できた！";
aiPlaceholder.style.display = "block";
}

renderResultSelectedCards();

if (completeTitle) completeTitle.innerHTML = "できあがり！";
if (completeMessage) completeMessage.textContent = "";

if (generatingIcon) generatingIcon.style.display = "none";
if (regenerateButton) regenerateButton.style.display = "block";

if (goPrintButton) {
goPrintButton.style.display = "block";
const label = goPrintButton.querySelector(".cube-button-label");
if (label) label.textContent = "カードをつくる";
}

if (completeResetButton) completeResetButton.style.display = "none";
if (resultSideLogo) resultSideLogo.style.display = "none";

updateRegenerateCountText();
}

function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

function loadImageWithRetry(imgElement, src, maxAttempts = 5) {
return new Promise(async (resolve, reject) => {
let lastError = null;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
try {
await new Promise((innerResolve, innerReject) => {
imgElement.onload = () => innerResolve();
imgElement.onerror = () => innerReject(new Error(`画像の読み込みに失敗しました ${attempt}/${maxAttempts}`));
imgElement.src = `${src}&retry=${attempt}&t=${Date.now()}`;
});

resolve();
return;
} catch (error) {
lastError = error;
console.warn("画像読み込みをリトライします", error);

if (attempt < maxAttempts) {
await sleep(900 * attempt);
}
}
}

reject(lastError || new Error("画像の読み込みに失敗しました"));
});
}

async function createSignedUrlWithRetry(path, maxAttempts = 5) {
let lastError = null;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
try {
const { data, error } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.createSignedUrl(path, 60 * 10);

if (error) throw error;

if (!data || !data.signedUrl) {
throw new Error("signedUrl が取得できませんでした");
}

return data.signedUrl;
} catch (error) {
lastError = error;
console.warn("画像URL取得をリトライします", error);

if (attempt < maxAttempts) {
await sleep(900 * attempt);
}
}
}

throw lastError || new Error("signedUrl が取得できませんでした");
}

async function showAiResult(fileName) {
const targetFileName = fileName || getCurrentAiCandidateFileName() || state.aiFile;
const aiPath = `outputs/${targetFileName}`;

const aiPreview = document.getElementById("aiPreview");
const beforePreview = document.getElementById("beforePreview");
const beforeAfterToggle = document.getElementById("beforeAfterToggle");
const beforeAfterToggleLabel = document.getElementById("beforeAfterToggleLabel");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const completeMessage = document.getElementById("completeMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");

if (resultCenterIcon) resultCenterIcon.textContent = "";

if (aiPlaceholder) {
aiPlaceholder.textContent = "がぞうを\nよみこみ中...";
aiPlaceholder.style.display = "block";
}

if (!aiPreview) return;

aiPreview.style.display = "none";

try {
const signedUrl = await createSignedUrlWithRetry(aiPath, 5);

await loadImageWithRetry(aiPreview, signedUrl, 5);

aiPreview.style.display = "block";

const resultCenterMessage = document.getElementById("resultCenterMessage");

if (resultCenterMessage) {
resultCenterMessage.style.display = "none";
}

if (aiPlaceholder) {
aiPlaceholder.style.display = "none";
}

if (completeMessage) {
completeMessage.textContent = "";
}

if (beforePreview && state.photoBlob) {
beforePreview.src = URL.createObjectURL(state.photoBlob);
beforePreview.style.display = "none";
}

state.showingBefore = false;

if (beforeAfterToggle) {
beforeAfterToggle.style.display = "block";
beforeAfterToggle.classList.remove("show-before");
}

if (beforeAfterToggleLabel) {
beforeAfterToggleLabel.textContent = "つみき";
}

updateAiVersionControls();
} catch (error) {
console.error(error);

aiPreview.style.display = "none";

if (aiPlaceholder) {
aiPlaceholder.style.display = "block";
aiPlaceholder.textContent = `がぞうをよみこめませんでした\n${aiPath}`;
}

if (completeMessage) {
completeMessage.textContent = "スタッフをよんでください";
}
}
}

function toggleBeforeAfterImage() {
const aiPreview = document.getElementById("aiPreview");
const beforePreview = document.getElementById("beforePreview");
const beforeAfterToggle = document.getElementById("beforeAfterToggle");
const beforeAfterToggleLabel = document.getElementById("beforeAfterToggleLabel");

if (!aiPreview || !beforePreview) return;
if (!state.photoBlob) return;

if (!beforePreview.src) {
beforePreview.src = URL.createObjectURL(state.photoBlob);
}

state.showingBefore = !state.showingBefore;

if (state.showingBefore) {
aiPreview.style.display = "none";
beforePreview.style.display = "block";

if (beforeAfterToggle) {
beforeAfterToggle.classList.add("show-before");
}

if (beforeAfterToggleLabel) {
beforeAfterToggleLabel.textContent = "へんしん";
}
} else {
beforePreview.style.display = "none";
aiPreview.style.display = "block";

if (beforeAfterToggle) {
beforeAfterToggle.classList.remove("show-before");
}

if (beforeAfterToggleLabel) {
beforeAfterToggleLabel.textContent = "つみき";
}
}

updateAiVersionControls();
}

function updateAiVersionControls() {
const prevButton = document.getElementById("aiPrevVersionButton");
const nextButton = document.getElementById("aiNextVersionButton");

const hasPrevious =
state.aiCandidates.length > 1 &&
state.currentAiCandidateIndex > 0 &&
!state.showingBefore;

const hasNext =
state.aiCandidates.length > 1 &&
state.currentAiCandidateIndex < state.aiCandidates.length - 1 &&
!state.showingBefore;

if (prevButton) prevButton.style.display = hasPrevious ? "block" : "none";
if (nextButton) nextButton.style.display = hasNext ? "block" : "none";
}

async function showPreviousAiVersion() {
if (state.currentAiCandidateIndex <= 0) return;

state.currentAiCandidateIndex -= 1;

const fileName = getCurrentAiCandidateFileName();
if (!fileName) return;

await showAiResult(fileName);
}

async function showNextAiVersion() {
if (state.currentAiCandidateIndex >= state.aiCandidates.length - 1) return;

state.currentAiCandidateIndex += 1;

const fileName = getCurrentAiCandidateFileName();
if (!fileName) return;

await showAiResult(fileName);
}

function updateRegenerateCountText() {
const regenerateCountText = document.getElementById("regenerateCountText");
const regenerateButton = document.getElementById("regenerateButton");

const generatedCount = state.aiCandidates.length;
const remaining = Math.max(0, 3 - generatedCount);

if (regenerateCountText) {
regenerateCountText.textContent = `${generatedCount}/3`;
regenerateCountText.style.display = "block";
}

if (regenerateButton) {
regenerateButton.disabled = remaining <= 0;
}
}

async function submitData() {
try {
setSubmitButtonDisabled(true);
setSubmitStatus("しゃしんをほぞんしています...");

state.regenerateRemaining = 3;
state.aiCandidates = [];
state.currentAiCandidateIndex = 0;
state.regenerateMode = false;

await uploadPhotoToSupabase();

setSubmitStatus("");
setupGeneratingScreen();
goToPage("page-complete");

await generateAiImage(state.regenerateMode ? state.aiCandidates.length + 1 : 1);

setupGeneratedScreen();
await showAiResult(getCurrentAiCandidateFileName());

} catch (error) {
console.error(error);

setSubmitButtonDisabled(false);
setSubmitStatus("");

const resultCenterMessage = document.getElementById("resultCenterMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const completeTitle = document.getElementById("completeTitle");
const completeMessage = document.getElementById("completeMessage");
const generatingIcon = document.getElementById("generatingIcon");
const regenerateButton = document.getElementById("regenerateButton");
const regenerateCountText = document.getElementById("regenerateCountText");
const completeResetButton = document.getElementById("completeResetButton");
const goPrintButton = document.getElementById("goPrintButton");
const resultSideLogo = document.getElementById("resultSideLogo");

if (resultCenterMessage) resultCenterMessage.style.display = "flex";
if (resultCenterIcon) resultCenterIcon.textContent = "⚠️";

if (aiPlaceholder) {
aiPlaceholder.innerHTML = "うまく<br>できませんでした";
aiPlaceholder.style.display = "block";
}

if (completeTitle) completeTitle.innerHTML = "うまくできませんでした";
if (completeMessage) completeMessage.textContent = "スタッフをよんでください";
if (generatingIcon) generatingIcon.style.display = "none";
if (regenerateButton) regenerateButton.style.display = "none";
if (regenerateCountText) regenerateCountText.style.display = "none";
if (goPrintButton) goPrintButton.style.display = "none";
if (completeResetButton) completeResetButton.style.display = "block";
if (resultSideLogo) resultSideLogo.style.display = "none";

goToPage("page-complete");
}
}

async function regenerateAiImage() {
if (state.aiCandidates.length >= 3) {
updateRegenerateCountText();
return;
}

const nextIndex = state.aiCandidates.length + 1;

try {
const regenerateButton = document.getElementById("regenerateButton");

if (regenerateButton) regenerateButton.disabled = true;

setupGeneratingScreen();

await generateAiImage(nextIndex);

setupGeneratedScreen();
await showAiResult(getCurrentAiCandidateFileName());

updateRegenerateCountText();
state.regenerateMode = false;

} catch (error) {
console.error(error);

const resultCenterMessage = document.getElementById("resultCenterMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const completeTitle = document.getElementById("completeTitle");
const completeMessage = document.getElementById("completeMessage");
const generatingIcon = document.getElementById("generatingIcon");
const regenerateButton = document.getElementById("regenerateButton");
const regenerateCountText = document.getElementById("regenerateCountText");
const completeResetButton = document.getElementById("completeResetButton");
const goPrintButton = document.getElementById("goPrintButton");
const resultSideLogo = document.getElementById("resultSideLogo");

if (resultCenterMessage) resultCenterMessage.style.display = "flex";
if (resultCenterIcon) resultCenterIcon.textContent = "⚠️";

if (aiPlaceholder) {
aiPlaceholder.innerHTML = "うまく<br>できませんでした";
aiPlaceholder.style.display = "block";
}

if (completeTitle) completeTitle.innerHTML = "うまくできませんでした";
if (completeMessage) completeMessage.textContent = "スタッフをよんでください";
if (generatingIcon) generatingIcon.style.display = "none";

if (regenerateButton) {
regenerateButton.style.display = "block";
}

if (regenerateCountText) regenerateCountText.style.display = "block";
if (goPrintButton) goPrintButton.style.display = "none";
if (completeResetButton) completeResetButton.style.display = "block";
if (resultSideLogo) resultSideLogo.style.display = "none";

updateRegenerateCountText();
}
}

/* ==================================================
はがき生成 / QR
================================================== */
function loadImageFromUrl(url) {
return new Promise((resolve, reject) => {
const img = new Image();
img.crossOrigin = "anonymous";

img.onload = () => resolve(img);
img.onerror = reject;

img.src = url;
});
}

function loadImageFromBlob(blob) {
return new Promise((resolve, reject) => {
const img = new Image();
const url = URL.createObjectURL(blob);

img.onload = () => {
URL.revokeObjectURL(url);
resolve(img);
};

img.onerror = error => {
URL.revokeObjectURL(url);
reject(error);
};

img.src = url;
});
}

function drawImageCover(ctx, img, x, y, width, height) {
const imageRatio = img.width / img.height;
const boxRatio = width / height;

let sx = 0;
let sy = 0;
let sw = img.width;
let sh = img.height;

if (imageRatio > boxRatio) {
sw = img.height * boxRatio;
sx = (img.width - sw) / 2;
} else {
sh = img.width / boxRatio;
sy = (img.height - sh) / 2;
}

ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
}

async function getAiImageBlob() {
const aiPath = `outputs/${state.aiFile}`;

const { data, error } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.download(aiPath);

if (error) throw error;

return data;
}

async function createPrintPostcardBlob() {
const baseImg = await loadImageFromUrl("print_base.jpg");
const photoImg = await loadImageFromBlob(state.photoBlob);
const aiBlob = await getAiImageBlob();
const aiImg = await loadImageFromBlob(aiBlob);

const canvas = document.createElement("canvas");
canvas.width = baseImg.naturalWidth || baseImg.width;
canvas.height = baseImg.naturalHeight || baseImg.height;

const ctx = canvas.getContext("2d");

ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

/* 画像：50px下げ */
const aiBaseX = 0;
const aiBaseY = 266;
const aiBaseSize = 1024;
const aiScale = 1.16;
const aiDrawSize = Math.round(aiBaseSize * aiScale);

const aiSourceSize = Math.min(aiImg.width, aiImg.height);
const aiSourceX = Math.round((aiImg.width - aiSourceSize) / 2);
const aiSourceY = Math.round((aiImg.height - aiSourceSize) / 2);

ctx.drawImage(
aiImg,
aiSourceX,
aiSourceY,
aiSourceSize,
aiSourceSize,
aiBaseX,
aiBaseY,
aiDrawSize,
aiDrawSize
);

const photoSize = Math.round(390 * 1.15);
const photoX = 0;
const photoY = canvas.height - photoSize;

drawImageCover(
ctx,
photoImg,
photoX,
photoY,
photoSize,
photoSize
);

ctx.save();
ctx.fillStyle = "#ffffff";
ctx.fillRect(photoX, photoY, photoSize, 20);
ctx.fillRect(photoX + photoSize - 20, photoY, 20, photoSize);
ctx.restore();

ctx.save();
ctx.fillStyle = "#5ccfe6";
ctx.textAlign = "right";
ctx.textBaseline = "middle";
ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
ctx.shadowBlur = 6;

/* 通し番号 */
const numberX = canvas.width - 54;
const numberY = 192;
ctx.font = "900 58px 'Hiragino Maru Gothic ProN', 'Hiragino Sans', system-ui, sans-serif";
ctx.fillText(state.entryId || "", numberX, numberY);

const numberWidth = ctx.measureText(state.entryId || "").width;
ctx.font = "900 24px 'Hiragino Maru Gothic ProN', 'Hiragino Sans', system-ui, sans-serif";
ctx.fillText("no.", numberX - numberWidth - 10, numberY + 4);

ctx.restore();

return await new Promise(resolve => {
canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.92);
});
}

async function uploadPrintPostcard(blob) {
const printPath = `printout/${state.printFile}`;

const { data, error } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.upload(printPath, blob, {
contentType: "image/jpeg",
upsert: true
});

if (error) throw error;

return data;
}

async function createPrintSignedUrl() {
const printPath = `printout/${state.printFile}`;

const { data, error } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.createSignedUrl(printPath, 60 * 60 * 24);

if (error) throw error;

if (!data || !data.signedUrl) {
throw new Error("print signedUrl が取得できませんでした");
}

return data.signedUrl;
}

async function renderPrintQr(url) {
const qrBox = document.getElementById("printQrBox");
if (!qrBox) return;

qrBox.innerHTML = "";

if (typeof QRCode === "undefined") {
throw new Error("QRコードライブラリが読み込めませんでした");
}

new QRCode(qrBox, {
text: url,
width: 190,
height: 190,
colorDark: "#3a2a1a",
colorLight: "#ffffff",
correctLevel: QRCode.CorrectLevel.M
});
}

async function finalizeCurrentAiImage() {
const currentFileName = getCurrentAiCandidateFileName();

if (!currentFileName) {
throw new Error("最終画像がありません");
}

const fromPath = `outputs/${currentFileName}`;
const toPath = `outputs/${state.aiFile}`;

const { data: blob, error: downloadError } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.download(fromPath);

if (downloadError) throw downloadError;

const { error: uploadError } = await supabaseClient.storage
.from(SUPABASE_BUCKET)
.upload(toPath, blob, {
contentType: "image/jpeg",
upsert: true
});

if (uploadError) throw uploadError;
}

async function goToPrintPage() {
if (state.showingBefore) {
toggleBeforeAfterImage();
}

try {
await finalizeCurrentAiImage();
} catch (error) {
console.error(error);

const completeMessage = document.getElementById("completeMessage");
if (completeMessage) {
completeMessage.textContent = "画像を保存できませんでした。スタッフをよんでください";
}

return;
}

goToPage("page-print");

const printLoading = document.getElementById("printLoading");
const printPreview = document.getElementById("printPreview");
const printQrBox = document.getElementById("printQrBox");
const printDownloadText = document.getElementById("printDownloadText");
const printStatus = document.getElementById("printStatus");
const printResetButton = document.getElementById("printResetButton");
const printTitle = document.getElementById("printTitle");
const printSideLogo = document.getElementById("printSideLogo");

try {
if (printLoading) {
printLoading.style.display = "block";
printLoading.textContent = "はがきをつくっているよ";
}

if (printTitle) {
printTitle.style.display = "none";
}

if (printSideLogo) {
printSideLogo.style.display = "block";
}

if (printPreview) {
printPreview.removeAttribute("src");
printPreview.style.display = "none";
}

if (printQrBox) {
printQrBox.style.display = "none";
printQrBox.innerHTML = "";
}

if (printDownloadText) printDownloadText.style.display = "none";
if (printStatus) printStatus.textContent = "";
if (printResetButton) printResetButton.style.display = "none";

const printBlob = await createPrintPostcardBlob();
state.printBlob = printBlob;

await uploadPrintPostcard(printBlob);

const signedUrl = await createPrintSignedUrl();
state.printSignedUrl = signedUrl;

if (printPreview) {
printPreview.src = URL.createObjectURL(printBlob);
printPreview.style.display = "block";
}

try {
await renderPrintQr(signedUrl);

if (printQrBox) printQrBox.style.display = "flex";

if (printDownloadText) {
printDownloadText.style.display = "block";
printDownloadText.innerHTML = "iPhoneでQRコードを<br>よみこむこともできるよ";
}
} catch (qrError) {
console.error("QRコード生成に失敗しました", qrError);

if (printQrBox) {
printQrBox.style.display = "none";
}

if (printDownloadText) {
printDownloadText.style.display = "block";
printDownloadText.innerHTML = "QRコードを<br>表示できませんでした";
}
}

if (printTitle) {
printTitle.style.display = "block";
}

if (printSideLogo) {
printSideLogo.style.display = "none";
}

if (printResetButton) printResetButton.style.display = "block";

if (printLoading) {
printLoading.style.display = "none";
printLoading.innerHTML = "";
}

} catch (error) {
console.error(error);

if (printTitle) {
printTitle.style.display = "none";
}

if (printSideLogo) {
printSideLogo.style.display = "block";
}

if (printLoading) {
printLoading.style.display = "block";
printLoading.innerHTML = "うまく<br>できませんでした";
}

if (printStatus) {
printStatus.textContent = "スタッフをよんでください";
}

if (printResetButton) {
printResetButton.style.display = "block";
}
}
}

/* ==================================================
RESET
================================================== */
function resetApp() {
stopBuildGuideSlides();

state.numberInput = "";
state.entryId = "";
state.photoFile = "";
state.aiFile = "";
state.printFile = "";
state.photoBlob = null;
state.printBlob = null;
state.printSignedUrl = "";
state.q1 = null;
state.q2 = null;
state.q3 = null;
state.showingBefore = false;
state.regenerateRemaining = 3;
state.aiCandidates = [];
state.currentAiCandidateIndex = 0;
state.regenerateMode = false;

updateNumberDisplay();
hideNumberMessage();

const cameraInput = document.getElementById("cameraInput");
if (cameraInput) cameraInput.value = "";

const photoPreview = document.getElementById("photoPreview");
if (photoPreview) {
photoPreview.src = "";
photoPreview.style.display = "none";
}

const retakeButton = document.getElementById("retakeButton");
const photoNextButton = document.getElementById("photoNextButton");
const cardANextButton = document.getElementById("cardANextButton");
const cardBNextButton = document.getElementById("cardBNextButton");
const cardCNextButton = document.getElementById("cardCNextButton");

if (retakeButton) retakeButton.disabled = true;
if (photoNextButton) photoNextButton.disabled = true;

if (cardANextButton) {
cardANextButton.disabled = true;
cardANextButton.classList.remove("show-next");
}

if (cardBNextButton) {
cardBNextButton.disabled = true;
cardBNextButton.classList.remove("show-next");
}

if (cardCNextButton) {
cardCNextButton.disabled = true;
cardCNextButton.classList.remove("show-next");
}

setSubmitButtonDisabled(false);
setSubmitStatus("");

const resultCenterMessage = document.getElementById("resultCenterMessage");
const resultCenterIcon = document.getElementById("resultCenterIcon");
const aiPreview = document.getElementById("aiPreview");
const beforePreview = document.getElementById("beforePreview");
const beforeAfterToggle = document.getElementById("beforeAfterToggle");
const beforeAfterToggleLabel = document.getElementById("beforeAfterToggleLabel");
const aiPrevVersionButton = document.getElementById("aiPrevVersionButton");
const aiNextVersionButton = document.getElementById("aiNextVersionButton");
const resultSelectedCards = document.getElementById("resultSelectedCards");
const aiPlaceholder = document.getElementById("aiPlaceholder");
const completeTitle = document.getElementById("completeTitle");
const completeMessage = document.getElementById("completeMessage");
const generatingIcon = document.getElementById("generatingIcon");
const regenerateButton = document.getElementById("regenerateButton");
const regenerateCountText = document.getElementById("regenerateCountText");
const goPrintButton = document.getElementById("goPrintButton");
const completeResetButton = document.getElementById("completeResetButton");
const resultSideLogo = document.getElementById("resultSideLogo");

const printPreview = document.getElementById("printPreview");
const printQrBox = document.getElementById("printQrBox");
const printDownloadText = document.getElementById("printDownloadText");
const printStatus = document.getElementById("printStatus");
const printResetButton = document.getElementById("printResetButton");
const printLoading = document.getElementById("printLoading");
const printTitle = document.getElementById("printTitle");
const printSideLogo = document.getElementById("printSideLogo");

if (resultCenterMessage) resultCenterMessage.style.display = "flex";
if (resultCenterIcon) resultCenterIcon.textContent = "";

if (aiPreview) {
aiPreview.src = "";
aiPreview.style.display = "none";
}

if (beforePreview) {
beforePreview.src = "";
beforePreview.style.display = "none";
}

if (beforeAfterToggle) {
beforeAfterToggle.style.display = "none";
beforeAfterToggle.classList.remove("show-before");
}

if (beforeAfterToggleLabel) {
beforeAfterToggleLabel.textContent = "つみき";
}

if (aiPrevVersionButton) aiPrevVersionButton.style.display = "none";
if (aiNextVersionButton) aiNextVersionButton.style.display = "none";

if (aiPlaceholder) {
aiPlaceholder.textContent = "つみきがへんしん中";
aiPlaceholder.style.display = "block";
}

if (completeTitle) completeTitle.textContent = "";
if (completeMessage) completeMessage.textContent = "";

if (generatingIcon) generatingIcon.style.display = "block";

if (regenerateButton) {
regenerateButton.style.display = "none";
regenerateButton.disabled = false;
}

if (regenerateCountText) {
regenerateCountText.textContent = "3/3";
regenerateCountText.style.display = "none";
}

if (goPrintButton) goPrintButton.style.display = "none";
if (completeResetButton) completeResetButton.style.display = "none";

if (resultSideLogo) {
resultSideLogo.style.display = "none";
}

if (printPreview) {
printPreview.src = "";
printPreview.style.display = "none";
}

if (printQrBox) {
printQrBox.innerHTML = "";
printQrBox.style.display = "none";
}

if (printDownloadText) printDownloadText.style.display = "none";
if (printStatus) printStatus.textContent = "";
if (printResetButton) printResetButton.style.display = "none";
if (printTitle) printTitle.style.display = "block";

if (printSideLogo) {
printSideLogo.style.display = "none";
}

if (printLoading) {
printLoading.style.display = "block";
printLoading.textContent = "はがきをつくっているよ";
}

updateStockBars();
resetCardScrollPositions();
updateCardSelectionVisuals();

goToPage("page-start");
}

/* ==================================================
Init
================================================== */
async function initApp() {
try {
await loadPromptCsvFiles();
csvLoaded = true;
csvLoadError = "";
console.log("select_card.csv を読み込みました", promptTables);
} catch (error) {
csvLoaded = false;
csvLoadError = error.message || String(error);
console.error("select_card.csv を読み込めませんでした", error);
alert(
"select_card.csv を読み込めませんでした。\n\n" +
"HTMLと同じフォルダに select_card.csv があるか確認してください。\n\n" +
csvLoadError
);
}

cardsA = createCardsFromPrefix("A", 30);
cardsB = createCardsFromPrefix("B", 30);
cardsC = createCardsFromPrefix("C", 30);

renderCardGroups("cardScrollA", cardsA, "A");
renderCardGroups("cardScrollB", cardsB, "B");
renderCardGroups("cardScrollC", cardsC, "C");

setupCardScrollArrowListeners();

updateNumberDisplay();
updateStockBars();
updateCardPageArrows();
goToPage("page-start");

}

initApp();


/* OWARI_RESET_DELEGATE_START */
function isPointInsideVisibleElement(element, x, y) {
if (!element) return false;
const style = window.getComputedStyle(element);
if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
const rect = element.getBoundingClientRect();
return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function handleOwariResetEvent(event) {
const buttons = [
document.getElementById("completeResetButton"),
document.getElementById("printResetButton")
];
const x = event.clientX ?? (event.changedTouches && event.changedTouches[0] && event.changedTouches[0].clientX);
const y = event.clientY ?? (event.changedTouches && event.changedTouches[0] && event.changedTouches[0].clientY);
const targetButton = buttons.find(button => {
if (!button) return false;
if (event.target === button || (event.target && button.contains(event.target))) return true;
if (typeof x === "number" && typeof y === "number") return isPointInsideVisibleElement(button, x, y);
return false;
});
if (!targetButton) return;
event.preventDefault();
event.stopPropagation();
resetApp();
}

document.addEventListener("click", handleOwariResetEvent, true);
document.addEventListener("pointerup", handleOwariResetEvent, true);
document.addEventListener("touchend", handleOwariResetEvent, true);
/* OWARI_RESET_DELEGATE_END */
