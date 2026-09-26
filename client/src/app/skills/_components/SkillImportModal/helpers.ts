/**
 * Read a file into base64 for the preview call. The browser never parses the
 * upload: frontmatter, archives and encodings are the server's problem, and
 * keeping one parser means the UI and the API can never disagree about what a
 * skill file contains.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      // Data URL: "data:<mime>;base64,<payload>" — we want the payload.
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
