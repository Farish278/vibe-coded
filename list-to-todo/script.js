document.addEventListener('DOMContentLoaded', () => {
    const listInput = document.getElementById('listInput');
    const convertBtn = document.getElementById('convertBtn');
    const inputSection = document.getElementById('inputSection');
    const listSection = document.getElementById('listSection');
    const todoItemsGrid = document.getElementById('todoItems');
    const resetBtn = document.getElementById('resetBtn');
    const taskStats = document.getElementById('taskStats');

    let tasks = [];

    const updateStats = () => {
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        if (total === 0) {
            taskStats.textContent = '';
        } else if (completed === total) {
            taskStats.textContent = '🎉 All tasks completed!';
        } else {
            taskStats.textContent = `${completed} of ${total} tasks completed`;
        }
    };

    const renderTasks = () => {
        todoItemsGrid.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `list-group-item bg-transparent ${task.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <input class="form-check-input flex-shrink-0" type="checkbox" ${task.completed ? 'checked' : ''} id="task-${index}">
                <label class="todo-text" for="task-${index}">${task.text}</label>
                <button class="btn btn-link btn-delete p-0 ms-2" title="Delete task">
                    <i class="bi bi-trash3"></i>
                </button>
            `;

            // Toggle checkbox
            const checkbox = li.querySelector('.form-check-input');
            checkbox.addEventListener('change', () => {
                tasks[index].completed = checkbox.checked;
                li.classList.toggle('completed', checkbox.checked);
                updateStats();
                saveTasks();
            });

            // Delete item
            const deleteBtn = li.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => {
                tasks.splice(index, 1);
                renderTasks();
                updateStats();
                saveTasks();
                if (tasks.length === 0) {
                    showInput();
                }
            });

            todoItemsGrid.appendChild(li);
        });
    };

    const showList = () => {
        inputSection.classList.add('d-none');
        listSection.classList.remove('d-none');
        listSection.classList.add('animate-in');
        updateStats();
    };

    const showInput = () => {
        listSection.classList.add('d-none');
        inputSection.classList.remove('d-none');
        listInput.value = '';
    };

    const saveTasks = () => {
        localStorage.setItem('vibe-todo-tasks', JSON.stringify(tasks));
    };

    const loadTasks = () => {
        const saved = localStorage.getItem('vibe-todo-tasks');
        if (saved) {
            tasks = JSON.parse(saved);
            if (tasks.length > 0) {
                renderTasks();
                showList();
            }
        }
    };

    convertBtn.addEventListener('click', () => {
        const text = listInput.value.trim();
        if (!text) return;

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        tasks = lines.map(line => ({
            text: line,
            completed: false
        }));

        renderTasks();
        showList();
        saveTasks();
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Clear all tasks and start over?')) {
            tasks = [];
            localStorage.removeItem('vibe-todo-tasks');
            showInput();
        }
    });

    // Auto-expand textarea (optional)
    listInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    loadTasks();
});
