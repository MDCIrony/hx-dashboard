// src/view/components/toast.js
export function toastView() {
  const root = document.createElement('div');
  root.className = 'toast';
  return root;
}

export function showToast(root, msg) {
  root.textContent = msg;
  root.classList.add('show');
  clearTimeout(root._t);
  root._t = setTimeout(() => root.classList.remove('show'), 3500);
}
