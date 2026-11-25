const storageKey = 'productivity-suite.task-manager.v1';
const form = document.querySelector('#task-form');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const list = document.querySelector('#tasks');
const status = document.querySelector('#status');
const starterTasks = [
  { title: 'Draft the demo checklist', description: 'List the steps you want to try.', completed: true },
  { title: 'Try saving a task', description: 'Add a task and reload to see it again.', completed: false },
];

let tasks = starterTasks;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) tasks = JSON.parse(saved);
} catch {
  status.textContent = 'Saved tasks could not be loaded.';
}

function save(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    status.textContent = message;
  } catch {
    status.textContent = 'Changes could not be saved in this browser.';
  }
}

function render() {
  list.replaceChildren();
  for (const [index, task] of tasks.entries()) {
    const item = document.createElement('li');
    const details = document.createElement('div');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      save(checkbox.checked ? 'Task completed.' : 'Task marked incomplete.');
    });
    const name = document.createElement('span');
    name.textContent = task.title;
    label.append(checkbox, name);
    details.append(label);
    if (task.description) {
      const note = document.createElement('p');
      note.textContent = task.description;
      details.append(note);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', 'Delete ' + task.title);
    remove.addEventListener('click', () => {
      tasks.splice(index, 1);
      save('Task deleted.');
      render();
      (list.children[index]?.querySelector('input') || title).focus();
    });
    item.append(details, remove);
    list.append(item);
  }
}

title.addEventListener('input', () => title.setCustomValidity(''));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = title.value.trim();
  if (!name) {
    title.setCustomValidity('Enter a task title.');
    title.reportValidity();
    return;
  }
  tasks.push({ title: name, description: description.value, completed: false });
  save('Task added.');
  render();
  form.reset();
  title.focus();
});
render();
