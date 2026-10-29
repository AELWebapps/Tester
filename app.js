"use strict";

/*
 * PHOTO RECORD GENERATOR
 *
 * Required template placeholders:
 *
 * {{SERVICE_DATE}}
 * {{LOCATION}}
 * {{PHOTO_TABLE}}
 *
 * MODES
 *
 * Standard:
 * 1–8 photos = 2 columns
 * 9 photos = 3 columns
 * More than 9 = new page every 9 photos
 *
 * Fit one page:
 * Automatically calculates rows and columns
 * and reduces image dimensions.
 */

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);

function initializeApp() {
  /* =====================================================
     ELEMENTS
     ===================================================== */

  const elements = {
    templateInput:
      document.querySelector("#templateInput"),

    photoInput:
      document.querySelector("#photoInput"),

    serviceDateInput:
      document.querySelector("#serviceDate"),

    locationInput:
      document.querySelector("#location"),

    fitOnePageMode:
      document.querySelector("#fitOnePageMode"),

    modeDescription:
      document.querySelector("#modeDescription"),

    previewGrid:
      document.querySelector("#previewGrid"),

    photoCount:
      document.querySelector("#photoCount"),

    dropZone:
      document.querySelector("#dropZone"),

    clearButton:
      document.querySelector("#clearButton"),

    generateButton:
      document.querySelector("#generateButton"),

    status:
      document.querySelector("#status")
  };

  const missingElements =
    Object.entries(elements)
      .filter(([, element]) =>!element)
      .map(([name]) => name);

  if (missingElements.length > 0) {
    console.error(
      "Missing HTML elements:",
      missingElements
    );

    alert(
      "The application could not start because " +
      "these HTML elements are missing:\n\n" +
      missingElements.join("\n")
    );

    return;
  }

  let photos = [];

  /* =====================================================
     EVENT LISTENERS
     ===================================================== */

  elements.photoInput.addEventListener(
    "change",
    event => {
      safelyAddFiles(event.target.files);
    }
  );

  elements.clearButton.addEventListener(
    "click",
    clearPhotos
  );

  elements.generateButton.addEventListener(
    "click",
    generateReport
  );

  elements.fitOnePageMode.addEventListener(
    "change",
    updateModeDescription
  );

  ["dragenter", "dragover"].forEach(eventName => {
    elements.dropZone.addEventListener(
      eventName,
      event => {
        event.preventDefault();
        event.stopPropagation();

        elements.dropZone.classList.add(
          "dragging"
        );
      }
    );
  });

  ["dragleave", "dragend", "drop"].forEach(
    eventName => {
      elements.dropZone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          event.stopPropagation();

          elements.dropZone.classList.remove(
            "dragging"
          );
        }
      );
    }
  );

  elements.dropZone.addEventListener(
    "drop",
    event => {
      safelyAddFiles(
        event.dataTransfer.files
      );
    }
  );

  /* =====================================================
     STARTUP
     ===================================================== */

  if (typeof JSZip === "undefined") {
    setStatus(
      "JSZip did not load. Check the JSZip script in index.html.",
      true
    );

    elements.generateButton.disabled = true;
  } else {
    setStatus("Application ready.");
  }

  updateModeDescription();
  renderPhotos();

  /* =====================================================
     MODE
     ===================================================== */

  function updateModeDescription() {
    if (elements.fitOnePageMode.checked) {
      elements.modeDescription.textContent =
        "Fit-one-page mode: rows, columns, and image " +
        "sizes will be calculated automatically.";
    } else {
      elements.modeDescription.textContent =
        "Standard mode: maximum nine photos per page.";
    }
  }

  /* =====================================================
     PHOTO SELECTION
     ===================================================== */

  function safelyAddFiles(fileList) {
    try {
      addFiles(fileList);
    } catch (error) {
      console.error(
        "Photo-selection error:",
        error
      );

      setStatus(
        `Photo selection failed: ${error.message}`,
        true
      );
    }
  }

  function addFiles(fileList) {
    const files = Array.from(
      fileList || []
    );

    if (files.length === 0) {
      setStatus(
        "No files were selected.",
        true
      );

      return;
    }

    const validMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png"
    ];

    const validFiles = files.filter(file => {
      const validType =
        validMimeTypes.includes(
          String(file.type).toLowerCase()
        );

      const validExtension =
        /\.(jpg|jpeg|png)$/i.test(
          file.name
        );

      return validType || validExtension;
    });

    const rejectedCount =
      files.length - validFiles.length;

    if (validFiles.length === 0) {
      elements.photoInput.value = "";

      setStatus(
        "No supported photos were selected. " +
        "Use JPG, JPEG, or PNG files.",
        true
      );

      return;
    }

    let duplicateCount = 0;

    for (const file of validFiles) {
      const duplicate = photos.some(photo =>
        photo.file.name === file.name &&
        photo.file.size === file.size &&
        photo.file.lastModified ===
          file.lastModified
      );

      if (duplicate) {
        duplicateCount += 1;
        continue;
      }

      photos.push({
        id: createId(),
        file,
        caption:
          removeFileExtension(file.name),
        previewUrl:
          URL.createObjectURL(file)
      });
    }

    elements.photoInput.value = "";

    renderPhotos();

    let message =
      `${photos.length} photo(s) selected.`;

    if (duplicateCount > 0) {
      message +=
        ` ${duplicateCount} duplicate file(s) ignored.`;
    }

    if (rejectedCount > 0) {
      message +=
        ` ${rejectedCount} unsupported file(s) ignored.`;
    }

    setStatus(message);
  }

  function createId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {
      return window.crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function removeFileExtension(filename) {
    return String(filename).replace(
      /\.[^.]+$/,
      ""
    );
  }

  /* =====================================================
     PHOTO BASKET
     ===================================================== */

  function clearPhotos() {
    photos.forEach(photo => {
      URL.revokeObjectURL(
        photo.previewUrl
      );
    });

    photos = [];

    renderPhotos();
    setStatus("Photo selection cleared.");
  }

  function removePhoto(index) {
    if (!photos[index]) {
      return;
    }

    URL.revokeObjectURL(
      photos[index].previewUrl
    );

    photos.splice(index, 1);

    renderPhotos();

    setStatus(
      `${photos.length} photo(s) selected.`
    );
  }

  function movePhoto(index, direction) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= photos.length
    ) {
      return;
    }

    [
      photos[index],
      photos[targetIndex]
    ] = [
      photos[targetIndex],
      photos[index]
    ];

    renderPhotos();
    setStatus("Photo order updated.");
  }

  function renderPhotos() {
    elements.photoCount.textContent =
      `${photos.length} selected`;

    elements.previewGrid.innerHTML = "";

    if (photos.length === 0) {
      const emptyState =
        document.createElement("p");

      emptyState.className =
        "empty-state";

      emptyState.textContent =
        "No photos selected yet.";

      elements.previewGrid.append(
        emptyState
      );

      return;
    }

    photos.forEach((photo, index) => {
      const card =
        document.createElement("article");

      card.className = "photo-card";

      const image =
        document.createElement("img");

      image.src = photo.previewUrl;

      image.alt =
        `Selected photo ${index + 1}`;

      const body =
        document.createElement("div");

      body.className = "photo-body";

      const title =
        document.createElement("strong");

      title.textContent =
        `Photo ${index + 1}`;

      const filename =
        document.createElement("p");

      filename.textContent =
        photo.file.name;

      filename.style.wordBreak =
        "break-word";

      const captionInput =
        document.createElement("input");

      captionInput.type = "text";

      captionInput.placeholder =
        "Photo caption";

      captionInput.value =
        photo.caption;

      captionInput.addEventListener(
        "input",
        event => {
          photos[index].caption =
            event.target.value;
        }
      );

      const controls =
        document.createElement("div");

      controls.className =
        "photo-controls";

      const moveLeftButton =
        makeButton(
          "←",
          "Move photo earlier",
          () => movePhoto(index, -1)
        );

      moveLeftButton.disabled =
        index === 0;

      const moveRightButton =
        makeButton(
          "→",
          "Move photo later",
          () => movePhoto(index, 1)
        );

      moveRightButton.disabled =
        index === photos.length - 1;

      const removeButton =
        makeButton(
          "Remove",
          "Remove photo",
          () => removePhoto(index),
          "danger"
        );

      controls.append(
        moveLeftButton,
        moveRightButton,
        removeButton
      );

      body.append(
        title,
        filename,
        captionInput,
        controls
      );

      card.append(
        image,
        body
      );

      elements.previewGrid.append(
        card
      );
    });
  }

  function makeButton(
    text,
    ariaLabel,
    clickHandler,
    extraClass = ""
  ) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      `small ${extraClass}`.trim();

    button.textContent = text;

    button.setAttribute(
      "aria-label",
      ariaLabel
    );

    button.addEventListener(
      "click",
      clickHandler
    );

    return button;
  }

  /* =====================================================
     GENERATION
     ===================================================== */

  async function generateReport() {
    const templateFile =
      elements.templateInput.files[0];

    const serviceDate =
      elements.serviceDateInput.value;

    const location =
      elements.locationInput.value.trim();

    const fitOnePage =
      elements.fitOnePageMode.checked;

    if (!templateFile) {
      setStatus(
        "Choose the Word template first.",
        true
      );

      return;
    }

    if (!/\.docx$/i.test(templateFile.name)) {
      setStatus(
        "The template must be a.docx file.",
        true
      );

      return;
    }

    if (!serviceDate) {
      setStatus(
        "Enter the service date.",
        true
      );

      return;
    }

    if (!location) {
      setStatus(
        "Enter the location.",
        true
      );

      return;
    }

    if (photos.length === 0) {
      setStatus(
        "Select at least one photograph.",
        true
      );

      return;
    }

    if (
      fitOnePage &&
      photos.length > 30
    ) {
      setStatus(
        "Fit-one-page mode supports a maximum of " +
        "30 photos so the results remain readable.",
        true
      );

      return;
    }

    if (typeof JSZip === "undefined") {
      setStatus(
        "JSZip is unavailable.",
        true
      );

      return;
    }

    elements.generateButton.disabled = true;

    try {
      setStatus(
        `Preparing ${photos.length} photo(s)...`
      );

      const templateBytes =
        await templateFile.arrayBuffer();

      const zip =
        await JSZip.loadAsync(
          templateBytes
        );

      const documentPath =
        "word/document.xml";

      const relationshipsPath =
        "word/_rels/document.xml.rels";

      const contentTypesPath =
        "[Content_Types].xml";

      const documentFile =
        zip.file(documentPath);

      const relationshipsFile =
        zip.file(relationshipsPath);

      const contentTypesFile =
        zip.file(contentTypesPath);

      if (
        !documentFile ||
        !relationshipsFile ||
        !contentTypesFile
      ) {
        throw new Error(
          "The selected file is not a valid Word template."
        );
      }

      let documentXml =
        await documentFile.async("string");

      let relationshipsXml =
        await relationshipsFile.async(
          "string"
        );

      let contentTypesXml =
        await contentTypesFile.async(
          "string"
        );

      const formattedServiceDate =
        formatDate(serviceDate);

      documentXml =
        replaceSimplePlaceholder(
          documentXml,
          "{{SERVICE_DATE}}",
          formattedServiceDate
        );

      documentXml =
        replaceSimplePlaceholder(
          documentXml,
          "{{LOCATION}}",
          location
        );

      const imageRecords = [];

      for (
        let index = 0;
        index < photos.length;
        index += 1
      ) {
        setStatus(
          `Processing photo ${index + 1} ` +
          `of ${photos.length}...`
        );

        const processedImage =
          await normalizeImage(
            photos[index].file,
            1400,
            1000
          );

        const mediaName =
          `photo_${index + 1}.jpg`;

        const relationshipId =
          findAvailableRelationshipId(
            relationshipsXml,
            index
          );

        zip.file(
          `word/media/${mediaName}`,
          processedImage.bytes
        );

        relationshipsXml =
          addImageRelationship(
            relationshipsXml,
            relationshipId,
            mediaName
          );

        imageRecords.push({
          relationshipId,
          width: processedImage.width,
          height: processedImage.height,

          caption:
            photos[index].caption ||
            `Photo ${index + 1}`
        });
      }

      contentTypesXml =
        ensureJpegContentType(
          contentTypesXml
        );

      const generatedPhotoXml =
        createPhotoContentXml(
          imageRecords,
          formattedServiceDate,
          location,
          fitOnePage
        );

      documentXml =
        replacePhotoTablePlaceholder(
          documentXml,
          "{{PHOTO_TABLE}}",
          generatedPhotoXml
        );

      zip.file(
        documentPath,
        documentXml
      );

      zip.file(
        relationshipsPath,
        relationshipsXml
      );

      zip.file(
        contentTypesPath,
        contentTypesXml
      );

      setStatus(
        "Creating the Word document..."
      );

      const outputBlob =
        await zip.generateAsync({
          type: "blob",

          mimeType:
            "application/vnd.openxmlformats-" +
            "officedocument.wordprocessingml.document"
        });

      const modeName =
        fitOnePage
          ? "One_Page"
          : "Standard";

      const filename =
        `Photo_Record_${serviceDate}_` +
        `${safeFilename(location)}_` +
        `${modeName}.docx`;

      downloadBlob(
        outputBlob,
        filename
      );

      setStatus(
        `Report generated successfully: ${filename}`
      );
    } catch (error) {
      console.error(
        "Generation error:",
        error
      );

      setStatus(
        `Generation failed: ${error.message}`,
        true
      );
    } finally {
      elements.generateButton.disabled =
        false;
    }
  }

  /* =====================================================
     PLACEHOLDERS
     ===================================================== */

  function replaceSimplePlaceholder(
    xml,
    placeholder,
    replacement
  ) {
    if (!xml.includes(placeholder)) {
      throw new Error(
        `The Word template is missing ${placeholder}.`
      );
    }

    return xml.replace(
      placeholder,
      escapeXml(replacement)
    );
  }

  function replacePhotoTablePlaceholder(
    xml,
    placeholder,
    generatedXml
  ) {
    const parser =
      new DOMParser();

    const xmlDocument =
      parser.parseFromString(
        xml,
        "application/xml"
      );

    if (
      xmlDocument.querySelector(
        "parsererror"
      )
    ) {
      throw new Error(
        "The Word document XML is invalid."
      );
    }

    const wordNamespace =
      "http://schemas.openxmlformats.org/" +
      "wordprocessingml/2006/main";

    const textNodes =
      Array.from(
        xmlDocument.getElementsByTagNameNS(
          wordNamespace,
          "t"
        )
      );

    const targetTextNode =
      textNodes.find(node =>
        node.textContent.includes(
          placeholder
        )
      );

    if (!targetTextNode) {
      throw new Error(
        `The Word template is missing ${placeholder}.`
      );
    }

    let placeholderParagraph =
      targetTextNode;

    while (
      placeholderParagraph &&
      placeholderParagraph.localName!== "p"
    ) {
      placeholderParagraph =
        placeholderParagraph.parentNode;
    }

    if (
      !placeholderParagraph ||
      !placeholderParagraph.parentNode
    ) {
      throw new Error(
        "The photo placeholder paragraph was not found."
      );
    }

    const fragmentDocument =
      parser.parseFromString(
        `<root
          xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
          xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
        >${generatedXml}</root>`,
        "application/xml"
      );

    if (
      fragmentDocument.querySelector(
        "parsererror"
      )
    ) {
      throw new Error(
        "The generated photo XML is invalid."
      );
    }

    const generatedElements =
      Array.from(
        fragmentDocument.documentElement
          .children
      );

    if (generatedElements.length === 0) {
      throw new Error(
        "No photo layout was generated."
      );
    }

    const parent =
      placeholderParagraph.parentNode;

    generatedElements.forEach(element => {
      parent.insertBefore(
        xmlDocument.importNode(
          element,
          true
        ),
        placeholderParagraph
      );
    });

    parent.removeChild(
      placeholderParagraph
    );

    return new XMLSerializer()
      .serializeToString(xmlDocument);
  }

  /* =====================================================
     IMAGE PROCESSING
     ===================================================== */

  async function normalizeImage(
    file,
    maxWidth,
    maxHeight
  ) {
    const image =
      await loadImage(file);

    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight
    );

    const width = Math.max(
      1,
      Math.round(
        image.naturalWidth * scale
      )
    );

    const height = Math.max(
      1,
      Math.round(
        image.naturalHeight * scale
      )
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "The image-processing canvas is unavailable."
      );
    }

    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      width,
      height
    );

    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    const blob =
      await new Promise((resolve, reject) => {
        canvas.toBlob(
          result => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  `Could not process ${file.name}.`
                )
              );
            }
          },
          "image/jpeg",
          0.86
        );
      });

    return {
      bytes: await blob.arrayBuffer(),
      width,
      height
    };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image =
        new Image();

      const url =
        URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error(
            `Could not read ${file.name}.`
          )
        );
      };

      image.src = url;
    });
  }

  /* =====================================================
     MODE ROUTING
     ===================================================== */

  function createPhotoContentXml(
    imageRecords,
    serviceDate,
    location,
    fitOnePage
  ) {
    if (fitOnePage) {
      return createFitOnePageTable(
        imageRecords
      );
    }

    return createStandardPhotoPages(
      imageRecords,
      serviceDate,
      location
    );
  }

  /* =====================================================
     STANDARD MODE
     ===================================================== */

  function createStandardPhotoPages(
    imageRecords,
    serviceDate,
    location
  ) {
    if (imageRecords.length <= 8) {
      return createStandardTable(
        imageRecords,
        2,
        0
      );
    }

    const photosPerPage = 9;
    const fragments = [];

    for (
      let start = 0;
      start < imageRecords.length;
      start += photosPerPage
    ) {
      const pagePhotos =
        imageRecords.slice(
          start,
          start + photosPerPage
        );

      if (start > 0) {
        fragments.push(
          createPageBreakXml()
        );

        fragments.push(
          createPhotoPageHeaderXml(
            serviceDate,
            location
          )
        );
      }

      fragments.push(
        createStandardTable(
          pagePhotos,
          3,
          start
        )
      );
    }

    return fragments.join("");
  }

  function createPageBreakXml() {
    return `
      <w:p>
        <w:r>
          <w:br w:type="page"/>
        </w:r>
      </w:p>
    `;
  }

  function createPhotoPageHeaderXml(
    serviceDate,
    location
  ) {
    return `
      <w:p>
        <w:pPr>
          <w:spacing
            w:before="0"
            w:after="60"
          />
        </w:pPr>

        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="24"/>
          </w:rPr>

          <w:t>Supporting Photos:</w:t>
        </w:r>
      </w:p>

      <w:p>
        <w:pPr>
          <w:spacing
            w:before="0"
            w:after="20"
          />
        </w:pPr>

        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>

          <w:t>${escapeXml(
            `Service date: ${serviceDate}`
          )}</w:t>
        </w:r>
      </w:p>

      <w:p>
        <w:pPr>
          <w:spacing
            w:before="0"
            w:after="240"
          />
        </w:pPr>

        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>

          <w:t>${escapeXml(
            `Location: ${location}`
          )}</w:t>
        </w:r>
      </w:p>
    `;
  }

  function createStandardTable(
    imageRecords,
    columns,
    startingIndex
  ) {
    const tableWidth = 8600;

    const cellWidth =
      Math.floor(
        tableWidth / columns
      );

    const rows = [];

    for (
      let index = 0;
      index < imageRecords.length;
      index += columns
    ) {
      const cells = [];

      for (
        let column = 0;
        column < columns;
        column += 1
      ) {
        const localIndex =
          index + column;

        const photo =
          imageRecords[localIndex];

        if (photo) {
          cells.push(
            createPhotoCellXml({
              imageRecord: photo,

              imageNumber:
                startingIndex +
                localIndex +
                1,

              cellWidth,

              maximumWidthEmu:
                columns === 3
                  ? 1630000
                  : 2550000,

              maximumHeightEmu:
                columns === 3
                  ? 1510000
                  : 2150000,

              captionFontSize:
                columns === 3
                  ? 16
                  : 18
            })
          );
        } else {
          cells.push(
            createEmptyCellXml(
              cellWidth
            )
          );
        }
      }

      rows.push(`
        <w:tr>
          <w:trPr>
            <w:cantSplit/>
          </w:trPr>

          ${cells.join("")}
        </w:tr>
      `);
    }

    return createTableXml({
      tableWidth,
      columns,
      cellWidth,
      rows,
      exactRowHeight: null
    });
  }

  /* =====================================================
     FIT ONE PAGE MODE
     ===================================================== */

  function calculateFitLayout(
    photoCount
  ) {
    const tableWidth = 8600;

    /*
     * Approximate vertical space remaining after:
     *
     * Supporting Photos
     * Service date
     * Location
     * Gap
     * Footer-safe area
     */

    const availableHeight = 7600;

    const maximumColumns =
      Math.min(photoCount, 6);

    let bestLayout = null;

    for (
      let columns = 1;
      columns <= maximumColumns;
      columns += 1
    ) {
      const rows =
        Math.ceil(
          photoCount / columns
        );

      const cellWidth =
        Math.floor(
          tableWidth / columns
        );

      const rowHeight =
        Math.floor(
          availableHeight / rows
        );

      /*
       * Reserve space for:
       *
       * Caption
       * Borders
       * Cell padding
       */

      const usableWidth =
        cellWidth - 220;

      const usableHeight =
        rowHeight - 450;

      if (
        usableWidth <= 0 ||
        usableHeight <= 0
      ) {
        continue;
      }

      /*
       * Score based on a 4:3 image.
       */

      const heightFromWidth =
        usableWidth * 0.75;

      const photoHeight =
        Math.min(
          usableHeight,
          heightFromWidth
        );

      const photoWidth =
        Math.min(
          usableWidth,
          photoHeight / 0.75
        );

      const score =
        photoWidth * photoHeight;

      if (
        !bestLayout ||
        score > bestLayout.score
      ) {
        bestLayout = {
          columns,
          rows,
          cellWidth,
          rowHeight,
          photoWidth,
          photoHeight,
          score
        };
      }
    }

    if (!bestLayout) {
      throw new Error(
        "A one-page layout could not be calculated."
      );
    }

    return bestLayout;
  }

  function createFitOnePageTable(
    imageRecords
  ) {
    const tableWidth = 8600;

    const layout =
      calculateFitLayout(
        imageRecords.length
      );

    const {
      columns,
      cellWidth,
      rowHeight,
      photoWidth,
      photoHeight
    } = layout;

    /*
     * One twip equals approximately 635 EMU.
     */

    const maximumWidthEmu =
      Math.max(
        100000,
        Math.floor(photoWidth * 635)
      );

    const maximumHeightEmu =
      Math.max(
        100000,
        Math.floor(photoHeight * 635)
      );

    let captionFontSize = 18;

    if (columns === 3) {
      captionFontSize = 16;
    } else if (columns === 4) {
      captionFontSize = 14;
    } else if (columns >= 5) {
      captionFontSize = 12;
    }

    const rows = [];

    for (
      let index = 0;
      index < imageRecords.length;
      index += columns
    ) {
      const cells = [];

      for (
        let column = 0;
        column < columns;
        column += 1
      ) {
        const photoIndex =
          index + column;

        const photo =
          imageRecords[photoIndex];

        if (photo) {
          cells.push(
            createPhotoCellXml({
              imageRecord: photo,
              imageNumber:
                photoIndex + 1,
              cellWidth,
              maximumWidthEmu,
              maximumHeightEmu,
              captionFontSize
            })
          );
        } else {
          cells.push(
            createEmptyCellXml(
              cellWidth
            )
          );
        }
      }

      rows.push(`
        <w:tr>
          <w:trPr>
            <w:cantSplit/>

            <w:trHeight
              w:val="${rowHeight}"
              w:hRule="exact"
            />
          </w:trPr>

          ${cells.join("")}
        </w:tr>
      `);
    }

    return createTableXml({
      tableWidth,
      columns,
      cellWidth,
      rows,
      exactRowHeight: rowHeight
    });
  }

  /* =====================================================
     SHARED TABLE GENERATOR
     ===================================================== */

  function createTableXml({
    tableWidth,
    columns,
    cellWidth,
    rows
  }) {
    const gridColumns =
      Array.from(
        { length: columns },
        () =>
          `<w:gridCol w:w="${cellWidth}"/>`
      ).join("");

    return `
      <w:tbl>
        <w:tblPr>
          <w:tblW
            w:w="${tableWidth}"
            w:type="dxa"
          />

          <w:tblLayout w:type="fixed"/>

          <w:jc w:val="center"/>

          <w:tblInd
            w:w="0"
            w:type="dxa"
          />

          <w:tblCellMar>
            <w:top
              w:w="40"
              w:type="dxa"
            />

            <w:left
              w:w="50"
              w:type="dxa"
            />

            <w:bottom
              w:w="40"
              w:type="dxa"
            />

            <w:right
              w:w="50"
              w:type="dxa"
            />
          </w:tblCellMar>

          <w:tblBorders>
            <w:top
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />

            <w:left
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />

            <w:bottom
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />

            <w:right
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />

            <w:insideH
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />

            <w:insideV
              w:val="single"
              w:sz="4"
              w:color="B7C4CE"
            />
          </w:tblBorders>
        </w:tblPr>

        <w:tblGrid>
          ${gridColumns}
        </w:tblGrid>

        ${rows.join("")}
      </w:tbl>
    `;
  }

  function createPhotoCellXml({
    imageRecord,
    imageNumber,
    cellWidth,
    maximumWidthEmu,
    maximumHeightEmu,
    captionFontSize
  }) {
    const widthRatio =
      maximumWidthEmu /
      imageRecord.width;

    const heightRatio =
      maximumHeightEmu /
      imageRecord.height;

    const scale =
      Math.min(
        widthRatio,
        heightRatio
      );

    const cx =
      Math.max(
        1,
        Math.round(
          imageRecord.width * scale
        )
      );

    const cy =
      Math.max(
        1,
        Math.round(
          imageRecord.height * scale
        )
      );

    const drawingId =
      1000 + imageNumber;

    const pictureId =
      2000 + imageNumber;

    return `
      <w:tc>
        <w:tcPr>
          <w:tcW
            w:w="${cellWidth}"
            w:type="dxa"
          />

          <w:vAlign w:val="center"/>
        </w:tcPr>

        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>

            <w:spacing
              w:before="0"
              w:after="10"
            />
          </w:pPr>

          <w:r>
            <w:drawing>
              <wp:inline
                distT="0"
                distB="0"
                distL="0"
                distR="0"
              >
                <wp:extent
                  cx="${cx}"
                  cy="${cy}"
                />

                <wp:docPr
                  id="${drawingId}"
                  name="Photo ${imageNumber}"
                />

                <wp:cNvGraphicFramePr>
                  <a:graphicFrameLocks
                    noChangeAspect="1"
                  />
                </wp:cNvGraphicFramePr>

                <a:graphic>
                  <a:graphicData
                    uri="http://schemas.openxmlformats.org/drawingml/2006/picture"
                  >
                    <pic:pic>
                      <pic:nvPicPr>
                        <pic:cNvPr
                          id="${pictureId}"
                          name="Photo ${imageNumber}"
                        />

                        <pic:cNvPicPr/>
                      </pic:nvPicPr>

                      <pic:blipFill>
                        <a:blip
                          r:embed="${imageRecord.relationshipId}"
                        />

                        <a:stretch>
                          <a:fillRect/>
                        </a:stretch>
                      </pic:blipFill>

                      <pic:spPr>
                        <a:xfrm>
                          <a:off
                            x="0"
                            y="0"
                          />

                          <a:ext
                            cx="${cx}"
                            cy="${cy}"
                          />
                        </a:xfrm>

                        <a:prstGeom prst="rect">
                          <a:avLst/>
                        </a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
        </w:p>

        <w:p>
          <w:pPr>
            <w:jc w:val="center"/>

            <w:spacing
              w:before="0"
              w:after="0"
            />
          </w:pPr>

          <w:r>
            <w:rPr>
              <w:sz
                w:val="${captionFontSize}"
              />
            </w:rPr>

            <w:t>${escapeXml(
              imageRecord.caption
            )}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    `;
  }

  function createEmptyCellXml(
    cellWidth
  ) {
    return `
      <w:tc>
        <w:tcPr>
          <w:tcW
            w:w="${cellWidth}"
            w:type="dxa"
          />

          <w:vAlign w:val="center"/>
        </w:tcPr>

        <w:p/>
      </w:tc>
    `;
  }

  /* =====================================================
     WORD PACKAGE HELPERS
     ===================================================== */

  function findAvailableRelationshipId(
    relationshipsXml,
    offset
  ) {
    let number = 5000 + offset;

    while (
      relationshipsXml.includes(
        `Id="rId${number}"`
      )
    ) {
      number += 1;
    }

    return `rId${number}`;
  }

  function addImageRelationship(
    relationshipsXml,
    relationshipId,
    mediaName
  ) {
    if (
      !relationshipsXml.includes(
        "</Relationships>"
      )
    ) {
      throw new Error(
        "The Word relationships file is invalid."
      );
    }

    const relationship = `
      <Relationship
        Id="${relationshipId}"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
        Target="media/${mediaName}"
      />
    `;

    return relationshipsXml.replace(
      "</Relationships>",
      `${relationship}</Relationships>`
    );
  }

  function ensureJpegContentType(
    contentTypesXml
  ) {
    if (
      /<Default[^>]+Extension="jpg"[^>]*>/i
        .test(contentTypesXml)
    ) {
      return contentTypesXml;
    }

    if (
      !contentTypesXml.includes(
        "</Types>"
      )
    ) {
      throw new Error(
        "The Word content-types file is invalid."
      );
    }

    return contentTypesXml.replace(
      "</Types>",

      '<Default ' +
      'Extension="jpg" ' +
      'ContentType="image/jpeg"/>' +
      "</Types>"
    );
  }

  /* =====================================================
     GENERAL HELPERS
     ===================================================== */

  function formatDate(value) {
    const date =
      new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    ).format(date);
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function safeFilename(value) {
    return String(value)
      .replace(
        /[<>:"/\\|?*]+/g,
        "_"
      )
      .replace(
        /\s+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );
  }

  function downloadBlob(
    blob,
    filename
  ) {
    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.append(link);

    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function setStatus(
    message,
    isError = false
  ) {
    elements.status.textContent =
      message;

    elements.status.style.color =
      isError
        ? "#a83232"
        : "#1f6f43";
  }
}
