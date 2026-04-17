function copyText(text) {
  const value = String(text ?? "");

  if (!value) {
    return Promise.resolve(false);
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(value)
      .then(() => true)
      .catch(() => fallbackCopyText(value));
  }

  return Promise.resolve(fallbackCopyText(value));
}

function fallbackCopyText(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}

export { copyText };
