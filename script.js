document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('projectSearch');
    const projectCards = document.querySelectorAll('.project-item');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            projectCards.forEach(card => {
                const titleEl = card.querySelector('.project-title');
                const descEl = card.querySelector('.project-desc');

                const title = titleEl ? titleEl.textContent.toLowerCase() : '';
                const desc = descEl ? descEl.textContent.toLowerCase() : '';

                if (title.includes(searchTerm) || desc.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.classList.add('animate-fade-in');
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Add smooth hover interactions
    // Set current year in footer
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});
