import type { ContentCheck, PageSnapshot } from "@/lib/qa/types";

export function analyzeContentSnapshot(snapshot: PageSnapshot): ContentCheck[] {
  return [
    {
      id: "document-title",
      title: "Document has a meaningful title",
      status: snapshot.title.trim() ? "pass" : "fail",
      severity: snapshot.title.trim() ? "info" : "medium",
      evidence: [
        {
          summary: snapshot.title.trim()
            ? `Document title: ${snapshot.title}`
            : "No document title was found.",
          rawToolOutput: snapshot.title,
        },
      ],
    },
    {
      id: "meta-description",
      title: "Page has a meta description",
      status: snapshot.description ? "pass" : "warning",
      severity: snapshot.description ? "info" : "low",
      evidence: [
        {
          summary: snapshot.description
            ? `Meta description: ${snapshot.description}`
            : "No meta description was found.",
          rawToolOutput: snapshot.description ?? "",
          reproductionNotes: 'Inspect `<meta name="description">` in the page head.',
        },
      ],
    },
    {
      id: "primary-heading",
      title: "Page has one primary H1",
      status: snapshot.h1.length === 1 ? "pass" : snapshot.h1.length === 0 ? "fail" : "warning",
      severity: snapshot.h1.length === 1 ? "info" : snapshot.h1.length === 0 ? "medium" : "low",
      evidence: [
        {
          summary:
            snapshot.h1.length === 1
              ? `Primary H1: ${snapshot.h1[0]}`
              : `${snapshot.h1.length} H1 elements found.`,
          selector: "h1",
          rawToolOutput: JSON.stringify(snapshot.h1),
          reproductionNotes: "Inspect the heading hierarchy and keep one page-level H1.",
        },
      ],
    },
  ];
}
