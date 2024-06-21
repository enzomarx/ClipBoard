// Funções JavaScript

// Carrega projetos do localStorage
let projects = JSON.parse(localStorage.getItem('projects')) || [];

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    alert(`Bem-vindo, ${username}!`);
    document.getElementById('profile-name').textContent = username;
    document.getElementById('profile-section').style.display = 'block';
}

function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    alert(`Usuário ${username} registrado com sucesso!`);
}

function addProject() {
    const projectName = document.getElementById('project-name').value;
    if (projectName) {
        const projectColor = getRandomLightColor();
        projects.push({ name: projectName, description: '', images: [], color: projectColor });
        saveProjects();
        renderProjects();
        document.getElementById('project-name').value = '';
    } else {
        alert('O nome do projeto não pode estar vazio.');
    }
}

function renderProjects() {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = '';
    projects.forEach((project, index) => {
        const projectElement = document.createElement('div');
        projectElement.className = 'project';
        projectElement.style.backgroundColor = project.color;
        projectElement.setAttribute('onclick', `showDetails(${index})`);

        const deleteButton = document.createElement('span');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = '✖';
        deleteButton.setAttribute('onclick', `deleteProject(${index}, event)`);

        const projectTitle = document.createElement('h3');
        projectTitle.textContent = project.name;

        projectElement.appendChild(deleteButton);
        projectElement.appendChild(projectTitle);
        projectsList.appendChild(projectElement);
    });
}

function getRandomLightColor() {
    const letters = 'BCDEF';  // Usar apenas letras que geram tons claros
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * letters.length)];
    }
    return color;
}

function showDetails(index) {
    const project = projects[index];
    document.getElementById('details-title').textContent = project.name;
    document.getElementById('details-editor').value = project.description;
    document.getElementById('image-preview-container').innerHTML = project.images.map((img, idx) => 
        `<img src="${img}" class="image-preview" onclick="removeImage(${index}, ${idx})">`).join('');
    document.getElementById('details-container').style.display = 'block';
    document.getElementById('details-container').setAttribute('data-index', index);
}

function closeDetails() {
    document.getElementById('details-container').style.display = 'none';
}

function saveDetails() {
    const index = document.getElementById('details-container').getAttribute('data-index');
    projects[index].description = document.getElementById('details-editor').value;
    const images = Array.from(document.getElementById('image-preview-container').children).map(img => img.src);
    projects[index].images = images;
    saveProjects();
    closeDetails();
}

function previewImage(event) {
    const index = document.getElementById('details-container').getAttribute('data-index');
    const reader = new FileReader();
    reader.onload = function () {
        const img = document.createElement('img');
        img.src = reader.result;
        img.classList.add('image-preview');
        img.onclick = () => removeImage(index, projects[index].images.length);
        document.getElementById('image-preview-container').appendChild(img);
        projects[index].images.push(reader.result);
        saveProjects();
    }
    reader.readAsDataURL(event.target.files[0]);
}

function removeImage(projectIndex, imageIndex) {
    projects[projectIndex].images.splice(imageIndex, 1);
    saveProjects();
    showDetails(projectIndex);
}

function deleteProject(index, event) {
    event.stopPropagation();
    projects.splice(index, 1);
    saveProjects();
    renderProjects();
}

function saveProjects() {
    localStorage.setItem('projects', JSON.stringify(projects));
}

function showHelp() {
    const helpMessage = document.getElementById('help-message');
    helpMessage.style.display = 'block';
    setTimeout(() => {
        helpMessage.style.display = 'none';
    }, 3000);
}

function listProjects() {
    renderProjects();
}

function logout() {
    document.getElementById('profile-section').style.display = 'none';
    document.getElementById('profile-name').textContent = '';
}

function translatePage() {
    const language = document.getElementById('language-select').value;
    const translations = {
        en: {
            title: 'Project Manager',
            username: 'Username',
            password: 'Password',
            login: 'Login',
            signup: 'Sign Up',
            projectNamePlaceholder: 'Project Name',
            addProject: 'Add Project',
            help: 'Help',
            listProjects: 'List Projects',
            detailsTitle: 'Project Details',
            description: 'Description:',
            attachImage: 'Attach Image:',
            save: 'Save',
            profile: 'Profile',
            name: 'Name:',
            logout: 'Logout'
        },
        pt: {
            title: 'Gerenciador de Projetos',
            username: 'Nome de usuário',
            password: 'Senha',
            login: 'Login',
            signup: 'Registrar',
            projectNamePlaceholder: 'Nome do Projeto',
            addProject: 'Adicionar Projeto',
            help: 'Ajuda',
            listProjects: 'Listar Projetos',
            detailsTitle: 'Detalhes do Projeto',
            description: 'Descrição:',
            attachImage: 'Anexar Imagem:',
            save: 'Salvar',
            profile: 'Perfil',
            name: 'Nome:',
            logout: 'Logout'
        },
        ru: {
            title: 'Менеджер Проектов',
            username: 'Имя пользователя',
            password: 'Пароль',
            login: 'Войти',
            signup: 'Зарегистрироваться',
            projectNamePlaceholder: 'Название Проекта',
            addProject: 'Добавить Проект',
            help: 'Помощь',
            listProjects: 'Список Проектов',
            detailsTitle: 'Детали Проекта',
            description: 'Описание:',
            attachImage: 'Прикрепить Изображение:',
            save: 'Сохранить',
            profile: 'Профиль',
            name: 'Имя:',
            logout: 'Выйти'
        }
    };

    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = translations[language][key];
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
    translatePage();
});