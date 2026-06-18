document.addEventListener('DOMContentLoaded', () => {
    const btnSubmit = document.getElementById('btn_submit');
    const userInput = document.getElementById('nas_user');
    const passInput = document.getElementById('nas_pass');

    const viewSignIn = document.getElementById('view-signin');
    const errorModal = document.getElementById('error-modal');
    const modalText = document.getElementById('modal-text');
    const modalClose = document.getElementById('modal-close');

    const btnContinue = document.getElementById('btn_continue');
    const viewSuccess = document.getElementById('view-success');
    const viewExplorer = document.getElementById('view-explorer');
    const dirContainer = document.getElementById('dir-container');
    const currentPathLabel = document.getElementById('current-path');
    const dropZone = document.getElementById('file-drop-zone');

    const btnNavHome = document.getElementById('btn_nav_home');
    const btnNavUp = document.getElementById('btn_nav_up');

    function showPopup(message) {
        if (modalText && errorModal) {
            modalText.innerText = message;
            errorModal.style.display = 'flex';
        } else {
            alert(message);
        }
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (errorModal) errorModal.style.display = 'none';
        });
    }

    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const username = userInput.value.trim();
            const passcode = passInput.value.trim();

            if (username === "" || passcode === "") {
                showPopup("One or both input fields are empty! Please try again!");
                return;
            }

            showPopup("Establishing secure tunnel...");
            
            try {
                const response = await fetch('http://100.79.90.113:5000/api/sftp-connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, passcode: passcode })
                });

                const result = await response.json();
                if (errorModal) errorModal.style.display = 'none'; 

                if (response.ok && result.success) {
                    if (viewSignIn && viewSuccess) {
                        viewSignIn.classList.add('page-view-hidden');
                        viewSuccess.classList.remove('page-view-hidden');
                    }
                } else {
                    showPopup("Connection attempt failed! Try Again!");
                }
            } catch (error) {
                showPopup("Authentication service offline! Check local server status.");
            }
        });
    }

    let sessionPath = "/";

    if (btnContinue) {
        btnContinue.addEventListener('click', () => {
            if (viewSuccess && viewExplorer) {
                viewSuccess.classList.add('page-view-hidden');
                viewExplorer.classList.remove('page-view-hidden');
                loadDirectory(sessionPath);
            }
        });
    }

    if (btnNavHome) {
        btnNavHome.addEventListener('click', () => {
            sessionPath = "/"; 
            loadDirectory(sessionPath);
        });
    }

    if (btnNavUp) {
        btnNavUp.addEventListener('click', () => {
            if (sessionPath === "." || sessionPath === "/") return;
            
            let parts = sessionPath.split('/');
            parts.pop();
            sessionPath = parts.join('/') || "/";
            
            loadDirectory(sessionPath);
        });
    }

    async function loadDirectory(path) {
        try {
            const response = await fetch('http://100.79.90.113:5000/api/sftp-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                showPopup(data.error || "Directory processing failure.");
                return;
            }
            
            dirContainer.innerHTML = '';
            
            if (currentPathLabel) currentPathLabel.innerText = data.current_path;
            sessionPath = data.current_path;

            if (data.items && Array.isArray(data.items)) {
                data.items.forEach(item => {
                    const element = document.createElement('div');
                    element.className = 'dir-item';
                    
                    const icon = document.createElement('div');
                    icon.className = item.type === 'dir' ? 'dir-icon' : 'file-icon';
                    
                    const name = document.createElement('span');
                    name.className = 'dir-name';
                    name.innerText = item.name;

                    element.appendChild(icon);
                    element.appendChild(name);

                    element.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        document.querySelectorAll('.dir-item').forEach(el => {
                            el.classList.remove('selected-item');
                        });
                        
                        element.classList.add('selected-item');
                    });

                    element.addEventListener('dblclick', async (e) => {
                        e.stopPropagation();

                        if (item.type === 'dir') {
                            let base = data.current_path.endsWith('/') ? data.current_path : `${data.current_path}/`;
                            sessionPath = `${base}${item.name}`;
                            loadDirectory(sessionPath);
                        } else {
                            showPopup(`Downloading: ${item.name}...`);
                            
                            try {
                                const response = await fetch('http://100.79.90.113:5000/api/sftp-download', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ path: data.current_path, filename: item.name })
                                });
                                
                                if (!response.ok) {
                                    showPopup("Failed downloading target asset stream.");
                                    return;
                                }
                                
                                const blob = await response.blob();
                                const downloadUrl = window.URL.createObjectURL(blob);
                                
                                const ghostAnchor = document.createElement('a');
                                ghostAnchor.href = downloadUrl;
                                ghostAnchor.download = item.name;
                                document.body.appendChild(ghostAnchor);
                                ghostAnchor.click();
                                
                                document.body.removeChild(ghostAnchor);
                                window.URL.revokeObjectURL(downloadUrl);
                                
                                if (errorModal) errorModal.style.display = 'none';
                                
                            } catch (error) {
                                showPopup("Fatal error pipelining binary down to disk.");
                            }
                        }
                    });

                    dirContainer.appendChild(element);
                });
            }
        } catch (error) {
            console.error("Layout Exception details:", error);
            showPopup("Failed loading remote target directory schema!");
        }
    }

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFileUpload(files);
        });
    }

    async function handleFileUpload(files) {
        const formData = new FormData();
        formData.append('path', sessionPath);
        
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }

        showPopup("Uploading staged media objects...");

        try {
            const response = await fetch('http://100.79.90.113:5000/api/sftp-upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                if (errorModal) errorModal.style.display = 'none';
                loadDirectory(sessionPath); 
            } else {
                showPopup("Upload failed! Ensure you have write permissions in this directory.");
            }
        } catch (error) {
            showPopup("Fatal error streaming file packet buffers.");
        }
    }
});