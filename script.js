// ===== STORAGE =====
function loadTasks() {
    return JSON.parse(localStorage.getItem("lls_tasks") || "[]");
}

function saveTasks(tasks) {
    localStorage.setItem("lls_tasks", JSON.stringify(tasks));
}

// ===== RENDER =====
function renderTasks() {
    const tasks = loadTasks();

    const longTasks = tasks.filter(t => t.type === "long").sort(sortTasks);
    const todoTasks = tasks.filter(t => t.type === "todo").sort(sortTasks);

    document.getElementById("longTasksList").innerHTML = longTasks.map(taskCard).join("");
    document.getElementById("todoTasksList").innerHTML = todoTasks.map(taskCard).join("");

    enableDragAndDrop();
    enableMultiSelect();
}

function sortTasks(a, b) {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;

    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    if (a.deadline && b.deadline)
        return new Date(a.deadline) - new Date(b.deadline);

    return a.title.localeCompare(b.title);
}

function taskCard(task) {
    return `
        <div class="task-card" draggable="true" data-id="${task.id}">
            <div>
                <div class="task-title ${task.completed ? "completed" : ""}">
                    ${task.title}
                </div>
                ${task.deadline ? `<div class="deadline">До: ${task.deadline}</div>` : ""}
            </div>

            <div class="dropdown">
                <i class="fa-solid fa-ellipsis-vertical menu-btn" data-bs-toggle="dropdown"></i>

                <ul class="dropdown-menu dropdown-menu-custom">
                    <li><a class="dropdown-item" onclick="toggleComplete('${task.id}')">Пометить как выполненное</a></li>
                    <li><a class="dropdown-item" onclick="editTask('${task.id}')">Редактировать</a></li>
                    <li><a class="dropdown-item text-danger" onclick="deleteTask('${task.id}')">Удалить</a></li>
                </ul>
            </div>
        </div>
    `;
}

// ===== MULTI SELECT (Ctrl + click) =====
let selectedTasks = new Set();

function enableMultiSelect() {
    document.querySelectorAll(".task-card").forEach(card => {
        card.onclick = (e) => {
            if (!e.ctrlKey) return;

            const id = card.dataset.id;

            if (selectedTasks.has(id)) {
                selectedTasks.delete(id);
                card.classList.remove("selected");
            } else {
                selectedTasks.add(id);
                card.classList.add("selected");
            }

            e.stopPropagation();
        };
    });
}

// ===== DRAG & DROP =====
let dragged = null;

function enableDragAndDrop() {
    document.querySelectorAll(".task-card").forEach(card => {

        card.addEventListener("dragstart", (e) => {
            dragged = card;
            setTimeout(() => card.style.opacity = "0.3", 0);
        });

        card.addEventListener("dragend", () => {
            dragged.style.opacity = "1";
            dragged = null;
            saveOrder();
        });

        card.addEventListener("dragover", (e) => e.preventDefault());

        card.addEventListener("drop", () => {
            const list = card.parentElement;
            if (dragged !== card) {
                list.insertBefore(dragged, card);
            }
            saveOrder();
        });
    });
}

function saveOrder() {
    const tasks = loadTasks();

    // save ToDo order
    document.querySelectorAll("#todoTasksList .task-card").forEach((card, i) => {
        const t = tasks.find(x => x.id === card.dataset.id);
        t.order = i;
    });

    // save Long-term order
    document.querySelectorAll("#longTasksList .task-card").forEach((card, i) => {
        const t = tasks.find(x => x.id === card.dataset.id);
        t.order = i;
    });

    saveTasks(tasks);
}

// ===== CRUD =====
function addTask(type, title, deadline) {
    const tasks = loadTasks();

    tasks.push({
        id: crypto.randomUUID(),
        type,
        title,
        deadline: type === "long" ? deadline : null,
        completed: false,
        order: Date.now() // initial order
    });

    saveTasks(tasks);
    renderTasks();
}

function toggleComplete(id) {
    const tasks = loadTasks();

    // Если выбрано много — обрабатываем их
    if (selectedTasks.size > 0) {
        selectedTasks.forEach(selID => {
            const t = tasks.find(x => x.id === selID);
            if (t) t.completed = !t.completed;
        });
        selectedTasks.clear();
    } else {
        const task = tasks.find(t => t.id === id);
        task.completed = !task.completed;
    }

    saveTasks(tasks);
    renderTasks();
}

function deleteTask(id) {
    let tasks = loadTasks();

    if (selectedTasks.size > 0) {
        tasks = tasks.filter(t => !selectedTasks.has(t.id));
        selectedTasks.clear();
    } else {
        tasks = tasks.filter(t => t.id !== id);
    }

    saveTasks(tasks);
    renderTasks();
}

function editTask(id) {
    const task = loadTasks().find(t => t.id === id);
    editingTaskId = task.id;

    document.getElementById("taskType").value = task.type;
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDeadline").value = task.deadline || "";

    document.getElementById("deadlineField").style.display =
        task.type === "long" ? "block" : "none";

    taskModal.show();
}

// ===== CLEAR COMPLETED =====
document.getElementById("clearCompletedLong").onclick = () => {
    saveTasks(loadTasks().filter(t => !(t.type === "long" && t.completed)));
    renderTasks();
};

document.getElementById("clearCompletedTodo").onclick = () => {
    saveTasks(loadTasks().filter(t => !(t.type === "todo" && t.completed)));
    renderTasks();
};

// ===== MODAL =====
let editingTaskId = null;
const taskModal = new bootstrap.Modal(document.getElementById("taskModal"));

document.getElementById("openModalBtn").onclick = () => {
    editingTaskId = null;
    document.getElementById("taskType").value = "todo";
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDeadline").value = "";
    document.getElementById("deadlineField").style.display = "none";
    taskModal.show();
};

document.getElementById("taskType").onchange = () => {
    document.getElementById("deadlineField").style.display =
        document.getElementById("taskType").value === "long" ? "block" : "none";
};

document.getElementById("saveTaskBtn").onclick = () => {
    const type = document.getElementById("taskType").value;
    const title = document.getElementById("taskTitle").value.trim();
    const deadline = document.getElementById("taskDeadline").value;

    if (!title) return;

    const tasks = loadTasks();

    if (editingTaskId) {
        const t = tasks.find(x => x.id === editingTaskId);
        t.type = type;
        t.title = title;
        t.deadline = type === "long" ? deadline : null;
        saveTasks(tasks);
    } else {
        addTask(type, title, deadline);
    }

    taskModal.hide();
    renderTasks();
};

// INIT
renderTasks();
