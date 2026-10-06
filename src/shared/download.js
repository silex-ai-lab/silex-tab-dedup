/** Saves text as a file through a temporary link; needs no downloads permission. */
export function downloadText(text, filename, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** yyyy-mm-dd for file names. */
export function today() {
  return new Date().toISOString().slice(0, 10);
}
