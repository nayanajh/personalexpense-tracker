(() => {
    let installPrompt = null;

    function installButtonForHeader() {
        const header = document.querySelector(".header-actions, .auth-header-actions, .wl-header-btns");
        if (!header || document.getElementById("pwa-install-btn")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.id = "pwa-install-btn";
        button.className = header.matches(".wl-header-btns")
            ? "wl-btn-ghost pwa-install-btn"
            : "btn btn-secondary btn-sm pwa-install-btn";
        button.hidden = true;
        button.innerHTML = '<i class="fa-solid fa-download"></i><span>Install</span>';
        button.hidden = false;
        button.addEventListener("click", async () => {
            if (!installPrompt) {
                alert("Use your browser menu and choose Install app or Add to Home Screen.");
                return;
            }
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            button.hidden = true;
        });
        header.prepend(button);
    }

    function setupNetworkStatus() {
        const header = document.querySelector(".auth-header-actions, .wl-header-btns");
        if (!header || document.getElementById("pwa-network-status")) return;
        const status = document.createElement("span");
        status.id = "pwa-network-status";
        status.className = "pwa-network-status";
        status.setAttribute("role", "status");
        header.prepend(status);
        const update = () => {
            status.classList.toggle("offline", !navigator.onLine);
            status.textContent = navigator.onLine ? "Online" : "Offline";
            status.title = navigator.onLine
                ? "Internet connection is available."
                : "Offline. Account changes cannot reach the shared database.";
        };
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        update();
    }

    document.addEventListener("DOMContentLoaded", () => {
        installButtonForHeader();
        setupNetworkStatus();
        if ("serviceWorker" in navigator && location.protocol !== "file:") {
            navigator.serviceWorker.register("/service-worker.js")
                .catch(error => console.error("Could not register SpendFlow offline support:", error));
        }
    });

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        installPrompt = event;
        installButtonForHeader();
        const button = document.getElementById("pwa-install-btn");
        if (button) button.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
        installPrompt = null;
        const button = document.getElementById("pwa-install-btn");
        if (button) button.hidden = true;
    });
})();
