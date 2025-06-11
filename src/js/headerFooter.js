export async function loadHeaderAndFooter() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (!headerPlaceholder || !footerPlaceholder) {
    console.error('Header or footer placeholder not found');
    return;
  }

  try {
    const [headerResponse, footerResponse] = await Promise.all([
      fetch('header.html'),
      fetch('footer.html'),
    ]);
    if (!headerResponse.ok || !footerResponse.ok) {
      throw new Error('Failed to fetch header or footer');
    }
    headerPlaceholder.innerHTML = await headerResponse.text();
    footerPlaceholder.innerHTML = await footerResponse.text();
  } catch (err) {
    console.error('Error loading header and footer:', err);
  }
}
