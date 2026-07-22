const UI = {
    setActiveTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            if(b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
        });
    },

    setActiveConstrutora(id) {
        document.querySelectorAll('.card-construtora').forEach(c => {
            c.classList.remove('active');
        });
    }
};