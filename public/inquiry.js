const form = document.querySelector('#inquiry-form');
const params = new URLSearchParams(location.search);
for (const key of ['intent', 'plan']) {
  const input = form.elements.namedItem(key);
  if ([...input.options].some(option => option.value === params.get(key))) input.value = params.get(key);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const intent = form.elements.intent.selectedOptions[0].textContent;
  const subject = `${intent} — ${data.get('name')} (${data.get('plan')})`;
  const body = `Hello Mohit,\n\n${intent}\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\nPackage / service: ${data.get('plan')}\nWebsite: ${data.get('website') || 'Not supplied'}\n\nProject context:\n${data.get('brief')}\n\nPreferred times & time zone: ${data.get('times') || 'To be agreed'}\n\nPlease confirm the proposed scope, timing and any fees before we proceed.`;
  document.querySelector('#email-text').textContent = `To: mohit.parmar110@gmail.com\nSubject: ${subject}\n\n${body}`;
  document.querySelector('#email-link').href = `mailto:mohit.parmar110@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const review = document.querySelector('#email-review');
  review.hidden = false;
  review.setAttribute('tabindex', '-1');
  review.focus();
  review.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
});
document.querySelector('#copy-inquiry').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(document.querySelector('#email-text').textContent); status.textContent = 'Copied. Paste into your email app and send when ready.'; }
  catch { status.textContent = 'Please select and copy the inquiry text above.'; }
});
