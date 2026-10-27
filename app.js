const templateInput = document.querySelector("#templateInput");
const photoInput = document.querySelector("#photoInput");
const serviceDateInput = document.querySelector("#serviceDate");
const locationInput = document.querySelector("#location");
const previewGrid = document.querySelector("#previewGrid");
const photoCount = document.querySelector("#photoCount");
const dropZone = document.querySelector("#dropZone");
const clearButton = document.querySelector("#clearButton");
const generateButton = document.querySelector("#generateButton");
const status = document.querySelector("#status");
alert("app.js loaded");
let photos = [];

photoInput.addEventListener("change", event => addFiles(event.target.files));
clearButton.addEventListener("click", clearPhotos);
generateButton.addEventListener("click", generateReport);

["dragenter", "dragover"].forEach(type => {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach(type => {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", event => addFiles(event.dataTransfer.files));

function addFiles(fileList) {
  const validFiles = [...fileList].filter(file =>
    ["image/jpeg", "image/png"].includes(file.type)
  );

  for (const file of validFiles) {
    photos.push({
      id: crypto.randomUUID(),
      file,
      caption: file.name.replace(/\.[^.]+$/, ""),
      previewUrl: URL.createObjectURL(file)
    });
  }

  photoInput.value = "";
  renderPhotos();
}

function clearPhotos() {
  photos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
  photos = [];
  renderPhotos();
  setStatus("");
}

function movePhoto(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= photos.length) return;
  [photos[index], photos[target]] = [photos[target], photos[index]];
  renderPhotos();
}

function removePhoto(index) {
  URL.revokeObjectURL(photos[index].previewUrl);
  photos.splice(index, 1);
  renderPhotos();
}

function renderPhotos() {
  photoCount.textContent = `${photos.length} selected`;
  previewGrid.innerHTML = "";

  if (!photos.length) {
    previewGrid.innerHTML = &#x27;<p class="empty-state">No photos selected yet.</p>&#x27;;
    return;
  }

  photos.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const image = document.createElement("img");
    image.src = photo.previewUrl;
    image.alt = `Selected photo ${index + 1}`;

    const body = document.createElement("div");
    body.className = "photo-body";
    body.innerHTML = `<strong>Photo ${index + 1}</strong>`;

    const caption = document.createElement("input");
    caption.value = photo.caption;
    caption.placeholder = "Caption";
    caption.addEventListener("input", () => {
      photos[index].caption = caption.value;
    });

    const controls = document.createElement("div");
    controls.className = "photo-controls";

    const up = makeButton("←", () => movePhoto(index, -1));
    up.disabled = index === 0;

    const down = makeButton("→", () => movePhoto(index, 1));
    down.disabled = index === photos.length - 1;

    const remove = makeButton("Remove", () => removePhoto(index), "danger");
    controls.append(up, down, remove);
    body.append(caption, controls);
    card.append(image, body);
    previewGrid.append(card);
  });
}

function makeButton(text, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `small ${extraClass}`.trim();
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

async function generateReport() {
  const templateFile = templateInput.files[0];
  const serviceDate = serviceDateInput.value;
  const location = locationInput.value.trim();

  if (!templateFile) return setStatus("Choose a .docx template first.", true);
  if (!serviceDate) return setStatus("Enter the service date.", true);
  if (!location) return setStatus("Enter the location.", true);
  if (!photos.length) return setStatus("Select at least one photo.", true);

  generateButton.disabled = true;
  setStatus("Preparing photos and building the Word report...");

  try {
    const zip = await JSZip.loadAsync(await templateFile.arrayBuffer());
    const documentPath = "word/document.xml";
    const relsPath = "word/_rels/document.xml.rels";
    const typesPath = "[Content_Types].xml";

    let documentXml = await zip.file(documentPath).async("string");
    let relsXml = await zip.file(relsPath).async("string");
    let contentTypesXml = await zip.file(typesPath).async("string");

    documentXml = replaceTextPlaceholder(
      documentXml,
      "{{SERVICE_DATE}}",
      formatDate(serviceDate)
    );
    documentXml = replaceTextPlaceholder(
      documentXml,
      "{{LOCATION}}",
      location
    );

    const relationshipIds = [];
    const imageSizes = [];

    for (let index = 0; index < photos.length; index += 1) {
      const normalized = await normalizeImage(photos[index].file, 1600, 1200);
      const mediaName = `photo_${index + 1}.jpg`;
      const relationshipId = nextRelationshipId(relsXml, index);

      zip.file(`word/media/${mediaName}`, normalized.bytes);
      relsXml = addImageRelationship(relsXml, relationshipId, mediaName);
      relationshipIds.push(relationshipId);
      imageSizes.push(normalized);
    }

    contentTypesXml = ensureJpegContentType(contentTypesXml);

    const tableXml = createPhotoTableXml(
      relationshipIds,
      imageSizes,
      photos.map(photo => photo.caption)
    );

    documentXml = replacePlaceholderParagraphWithTable(
      documentXml,
      "{{PHOTO_TABLE}}",
      tableXml
    );

    zip.file(documentPath, documentXml);
    zip.file(relsPath, relsXml);
    zip.file(typesPath, contentTypesXml);

    const output = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    downloadBlob(
      output,
      `Photo_Record_${serviceDate}_${safeFilename(location)}.docx`
    );
    setStatus("Report generated successfully.");
  } catch (error) {
    console.error(error);
    setStatus(
      "Generation failed. Confirm the template placeholders are typed exactly and each placeholder is in its own paragraph.",
      true
    );
  } finally {
    generateButton.disabled = false;
  }
}

function replaceTextPlaceholder(xml, placeholder, value) {
  if (!xml.includes(placeholder)) {
    throw new Error(`Missing placeholder: ${placeholder}`);
  }
  return xml.replace(placeholder, escapeXml(value));
}

function replacePlaceholderParagraphWithTable(xml, placeholder, tableXml) {
  const parser = new DOMParser();
  const documentDom = parser.parseFromString(xml, "application/xml");
  const textNodes = [...documentDom.getElementsByTagNameNS(
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "t"
  )];

  const targetText = textNodes.find(node =>
    node.textContent.includes(placeholder)
  );

  if (!targetText) {
    throw new Error(`Missing table placeholder: ${placeholder}`);
  }

  let paragraph = targetText;
  while (paragraph && paragraph.localName !== "p") {
    paragraph = paragraph.parentNode;
  }

  const wrapper = parser.parseFromString(
    `<root xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
      xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
      xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">${tableXml}</root>`,
    "application/xml"
  );

  const table = wrapper.documentElement.firstElementChild;
  paragraph.parentNode.replaceChild(
    documentDom.importNode(table, true),
    paragraph
  );

  return new XMLSerializer().serializeToString(documentDom);
}

async function normalizeImage(file, maxWidth, maxHeight) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxWidth / bitmap.width,
    maxHeight / bitmap.height
  );

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, "image/jpeg", 0.86)
  );

  return {
    bytes: await blob.arrayBuffer(),
    width,
    height
  };
}

function createPhotoTableXml(relationshipIds, sizes, captions) {
  const rows = [];

  for (let index = 0; index < relationshipIds.length; index += 2) {
    rows.push(`
      <w:tr>
        ${createPhotoCellXml(
          relationshipIds[index],
          sizes[index],
          captions[index],
          index + 1
        )}
        ${relationshipIds[index + 1]
          ? createPhotoCellXml(
              relationshipIds[index + 1],
              sizes[index + 1],
              captions[index + 1],
              index + 2
            )
          : createEmptyCellXml()}
      </w:tr>
    `);
  }

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="B7C4CE"/>
          <w:left w:val="single" w:sz="4" w:color="B7C4CE"/>
          <w:bottom w:val="single" w:sz="4" w:color="B7C4CE"/>
          <w:right w:val="single" w:sz="4" w:color="B7C4CE"/>
          <w:insideH w:val="single" w:sz="4" w:color="B7C4CE"/>
          <w:insideV w:val="single" w:sz="4" w:color="B7C4CE"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4500"/>
        <w:gridCol w:w="4500"/>
      </w:tblGrid>
      ${rows.join("")}
    </w:tbl>
  `;
}

function createPhotoCellXml(relationshipId, size, caption, imageNumber) {
  const boxWidth = 3_900_000;
  const boxHeight = 2_800_000;
  const ratio = Math.min(boxWidth / size.width, boxHeight / size.height);
  const cx = Math.round(size.width * ratio);
  const cy = Math.round(size.height * ratio);

  return `
    <w:tc>
      <w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${cx}" cy="${cy}"/>
              <wp:docPr id="${1000 + imageNumber}" name="Photo ${imageNumber}"/>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic>
                    <pic:nvPicPr>
                      <pic:cNvPr id="${2000 + imageNumber}" name="Photo ${imageNumber}"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relationshipId}"/>
                      <a:stretch><a:fillRect/></a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${cx}" cy="${cy}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr><w:jc w:val="center"/></w:pPr>
        <w:r><w:t>${escapeXml(caption || `Photo ${imageNumber}`)}</w:t></w:r>
      </w:p>
    </w:tc>
  `;
}

function createEmptyCellXml() {
  return `
    <w:tc>
      <w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>
      <w:p/>
    </w:tc>
  `;
}

function nextRelationshipId(relsXml, index) {
  let number = 5000 + index;
  while (relsXml.includes(`Id="rId${number}"`)) number += 1;
  return `rId${number}`;
}

function addImageRelationship(relsXml, relationshipId, mediaName) {
  const relationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
  return relsXml.replace("</Relationships>", `${relationship}</Relationships>`);
}

function ensureJpegContentType(xml) {
  if (/Extension="jpe?g"/i.test(xml)) return xml;
  return xml.replace(
    "</Types>",
    &#x27;<Default Extension="jpg" ContentType="image/jpeg"/></Types>&#x27;
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(&#x27;"&#x27;, "&quot;")
    .replaceAll("&#x27;", "&apos;");
}

function safeFilename(value) {
  return value.replace(/[<>:"/\\|?*]+/g, "_").replace(/\s+/g, "_");
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#a83232" : "#1f6f43";
}

renderPhotos();
