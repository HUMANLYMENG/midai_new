function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
}

function closeForm() {
    document.getElementById('edit-form-container').classList.add('hidden');
}

function showAddAlbumForm() {
    document.getElementById("add-album-form-container").classList.remove("hidden");
}

function closeAddAlbumForm() {
    document.getElementById("add-album-form-container").classList.add("hidden");
}

function makeDraggable(element, handle) {
    let isDragging = false;
    let offsetX, offsetY;

    handle.addEventListener('mousedown', function (e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function (e) {
        if (isDragging) {
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
        handle.style.cursor = 'grab';
    });
}

function saveAlbum() {
    const albumId = document.getElementById('album-id').value;
    const data = {
        title: document.getElementById('title').value,
        artist: document.getElementById('artist').value,
        release_date: document.getElementById('release_date').value,
        genre: document.getElementById('genre').value,
        length: document.getElementById('length').value,
        label: document.getElementById('label').value,
        tag: document.getElementById('tag').value,
        comment: document.getElementById('comment').value,
        cover: document.getElementById('cover').value
    };

    fetch(`/api/album/${albumId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            alert('Album updated successfully!');
            location.reload();
        });
        window.bindClickEvents();  // 调用全局的 bindClickEvents 函数
}

function deleteAlbum() {
    const albumId = document.getElementById('album-id').value;

    if (!confirm("Are you sure you want to delete this album?")) {
        return;
    }

    fetch(`/api/album/${albumId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            alert('Album deleted successfully!');
            location.reload();
        });
        window.bindClickEvents();  // 调用全局的 bindClickEvents 函数
}

// 在文档加载完成后调用
document.addEventListener("DOMContentLoaded", function () {
    const editFormContainer = document.getElementById('edit-form-container');
    const addFormContainer = document.getElementById('add-album-form-container');
    const dragHandle = document.getElementById('drag-handle');
    const dragHandleadd = document.getElementById('drag-handle-add');
    makeDraggable(editFormContainer, dragHandle);
    makeDraggable(addFormContainer, dragHandleadd);
});

document.addEventListener("DOMContentLoaded", function () {
    const sortSelect = document.getElementById("sort-select");
    sortSelect.addEventListener("change", function () {
        const sortOption = sortSelect.value;
        fetchAlbums(sortOption);
    });

    // 初始加载时获取专辑列表
    fetchAlbums("default");
});

function fetchAlbums(sortOption) {
    fetch(`/api/albums_sort?sort=${sortOption}`)
        .then(response => response.json())
        .then(data => {
            const albumList = document.getElementById("album-list");
            albumList.innerHTML = ""; // 清空当前列表
            data.forEach(album => {
                const li = document.createElement("li");
                li.textContent = `${album.artist} - ${album.title}`;
                li.setAttribute('data-id', album.id); // 设置专辑 ID 到列表项
                li.classList.add('album-item'); // 添加 album-item 类
                li.addEventListener("dblclick", function () {
                    editAlbum(li);
                });
                albumList.appendChild(li);
            });
            
            window.bindClickEvents();  // 调用全局的 bindClickEvents 函数
        })

        .catch(error => {
            console.error("Error fetching albums:", error);
        });

}


function editAlbum(element) {
    const albumId = element.getAttribute('data-id');
    fetch(`/api/album/${albumId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('album-id').value = data.id;
            document.getElementById('title').value = data.title;
            document.getElementById('artist').value = data.artist;
            document.getElementById('release_date').value = data.release_date;
            document.getElementById('genre').value = data.genre;
            document.getElementById('length').value = data.length;
            document.getElementById('label').value = data.label;
            document.getElementById('edit-form-container').classList.remove('hidden');
        });
        window.bindClickEvents();  // 调用全局的 bindClickEvents 函数
}