const Clipboard = {
    copy(id, btn) {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = "✓ COPIADO";
            btn.style.backgroundColor = "var(--gold)";
            btn.style.color = "#000";
            
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.backgroundColor = "";
                btn.style.color = "";
            }, 2000);
        });
    }
};