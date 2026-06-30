import { writeDocxParts, type DocxParts } from "../docx/package";

export interface GoldenDocument {
  name: string;
  docx: Buffer;
  expected_features: Record<string, number>;
}

export class GoldenDocumentCorpus {
  constructor(public readonly documents: GoldenDocument[]) {}

  byName(name: string): GoldenDocument {
    const document = this.documents.find((item) => item.name === name);
    if (!document) throw new Error(`UNKNOWN_GOLDEN_DOCUMENT:${name}`);
    return document;
  }
}

export function buildGoldenCorpus(): GoldenDocumentCorpus {
  return new GoldenDocumentCorpus([
    complexFeatureDocument(),
    ...[5, 20, 100, 500].map(stressDocument),
  ]);
}

function complexFeatureDocument(): GoldenDocument {
  const body = `
    <w:p><w:pPr><w:pStyle w:val="GreenlitClause"/></w:pPr><w:bookmarkStart w:id="1" w:name="usage_rights"/><w:r><w:t>1. Usage Rights</w:t></w:r><w:bookmarkEnd w:id="1"/></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Brand may use content worldwide.</w:t></w:r><w:commentRangeStart w:id="0"/><w:r><w:commentReference w:id="0"/></w:r><w:commentRangeEnd w:id="0"/></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Nested paid media rights.</w:t></w:r></w:p>
    <w:p><w:hyperlink r:id="rExt"><w:r><w:t>Review source</w:t></w:r></w:hyperlink></w:p>
    <w:tbl><w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>Merged payment cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:p><w:sdt><w:sdtPr><w:tag w:val="creator_name"/></w:sdtPr><w:sdtContent><w:r><w:t>Creator Name</w:t></w:r></w:sdtContent></w:sdt></w:p>
    <w:p><w:fldSimple w:instr=" REF usage_rights \\h "><w:r><w:t>Usage Rights</w:t></w:r></w:fldSimple></w:p>
    <w:p><w:r><w:t>Footnote marker</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r></w:p>
    <w:p><w:r><w:t>Endnote marker</w:t></w:r><w:r><w:endnoteReference w:id="3"/></w:r></w:p>
    <w:p><w:r><w:t>Track change: </w:t></w:r><w:ins w:id="4" w:author="Greenlit" w:date="2026-06-28T00:00:00Z"><w:r><w:t>inserted cap</w:t></w:r></w:ins><w:del w:id="5" w:author="Greenlit" w:date="2026-06-28T00:00:00Z"><w:r><w:delText>old cap</w:delText></w:r></w:del></w:p>
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    <w:sectPr/>
  `;

  return {
    name: "complex_features",
    docx: writeFixture(body, {
      comments: '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment w:id="0" w:author="Greenlit" w:date="2026-06-28T00:00:00Z"><w:p><w:r><w:t>Limit usage rights.</w:t></w:r></w:p></w:comment></w:comments>',
      footnotes: '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="2"><w:p><w:r><w:t>Footnote text.</w:t></w:r></w:p></w:footnote></w:footnotes>',
      endnotes: '<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:endnote w:id="3"><w:p><w:r><w:t>Endnote text.</w:t></w:r></w:p></w:endnote></w:endnotes>',
    }),
    expected_features: { comments: 1, track_changes: 2, tables: 1, footnotes: 1, endnotes: 1 },
  };
}

function stressDocument(pageCount: number): GoldenDocument {
  const paragraphs: string[] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    paragraphs.push(`<w:p><w:r><w:t>Page ${page} creator contract clause with usage, payment, exclusivity, and approval language.</w:t></w:r></w:p>`);
    if (page < pageCount) paragraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  }
  return {
    name: `stress_${pageCount}_pages`,
    docx: writeFixture(paragraphs.join("")),
    expected_features: { page_breaks: pageCount - 1, paragraphs: pageCount + pageCount - 1 },
  };
}

function writeFixture(
  bodyXml: string,
  extras: { comments?: string; footnotes?: string; endnotes?: string } = {}
): Buffer {
  const overrides = [
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>',
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>',
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>',
  ];
  const relationships = [
    '<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '<Relationship Id="rHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
    '<Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
    '<Relationship Id="rImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>',
    '<Relationship Id="rExt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://greenlit.example/contracts" TargetMode="External"/>',
  ];
  if (extras.comments) {
    overrides.push('<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>');
    relationships.push('<Relationship Id="rComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>');
  }
  if (extras.footnotes) {
    overrides.push('<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>');
    relationships.push('<Relationship Id="rFootnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>');
  }
  if (extras.endnotes) {
    overrides.push('<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>');
    relationships.push('<Relationship Id="rEndnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>');
  }

  const parts: DocxParts = new Map([
    ["[Content_Types].xml", Buffer.from(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${overrides.join("")}</Types>`)],
    ["_rels/.rels", Buffer.from('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')],
    ["word/_rels/document.xml.rels", Buffer.from(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`)],
    ["word/document.xml", Buffer.from(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`)],
    ["word/styles.xml", Buffer.from('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"/><w:style w:type="paragraph" w:styleId="GreenlitClause" w:customStyle="1"/></w:styles>')],
    ["word/numbering.xml", Buffer.from('<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"/><w:lvl w:ilvl="1"/></w:abstractNum><w:num w:numId="1"/></w:numbering>')],
    ["word/header1.xml", Buffer.from('<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Greenlit Header</w:t></w:r></w:p></w:hdr>')],
    ["word/footer1.xml", Buffer.from('<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Greenlit Footer</w:t></w:r></w:p></w:ftr>')],
    ["word/media/image1.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR4nGNgYGAAAAAEAAGjChXjAAAAAElFTkSuQmCC", "base64")],
  ]);
  if (extras.comments) parts.set("word/comments.xml", Buffer.from(extras.comments));
  if (extras.footnotes) parts.set("word/footnotes.xml", Buffer.from(extras.footnotes));
  if (extras.endnotes) parts.set("word/endnotes.xml", Buffer.from(extras.endnotes));
  return writeDocxParts(parts);
}
