// Sistema de Planner com Calendário e Banco de Dados
const API_URL = 'http://localhost:3000/api';
let tasks = [];
let currentDate = new Date();
let selectedDate = new Date();

// Variáveis do cronômetro
let timerInterval = null;
let timerSeconds = 0;
let timerPaused = false;
let currentTimerTask = null;

// Carrega as tarefas quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    await loadTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    updateEmptyMessage();
    updateDateTitle();
    if (isFitnessMode) updateTotalTime();
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        updateSubjectsCount();
        updateStudyTime();
    }
    
    // Permite adicionar tarefa com Enter
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Se for modo fitness, também adiciona listener no campo de tempo
    if (isFitnessMode) {
        document.getElementById('timeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }
    
    // Se for modo estudo, também adiciona listener no campo de matéria e tempo
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        document.getElementById('subjectInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('taskInput').focus();
            }
        });
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTaskWithTimer();
            }
        });
    }
});

// Carrega tarefas do banco de dados
async function loadTasks() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/${currentUser}/${plannerType}`);
        const dbTasks = await response.json();
        
        // Converte os dados do banco para o formato do app
        tasks = dbTasks.map(t => ({
            id: t.task_id,
            text: t.text,
            completed: t.completed === 1,
            date: t.date,
            time: t.time,
            minutes: t.minutes,
            timeValue: t.time_value,
            timeUnit: t.time_unit,
            timeDisplay: t.time_display,
            subject: t.subject
        }));
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        tasks = [];
    }
}

// Salva tarefas no banco de dados
async function saveTasks() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;
    
    try {
        await fetch(`${API_URL}/tasks/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUser,
                type: plannerType,
                tasks: tasks
            })
        });
    } catch (error) {
        console.error('Erro ao salvar tarefas:', error);
    }
}

// Renderiza o calendário
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Atualiza o título do mês
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Primeiro dia do mês e último dia do mês
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // Dias do mês anterior
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        const dayElement = createDayElement(day, 'other-month', new Date(year, month - 1, day));
        calendarDays.appendChild(dayElement);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= lastDate; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, new Date());
        const isSelected = isSameDay(date, selectedDate);
        const hasTasks = getTasksForDate(date).length > 0;
        
        let classes = '';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasTasks) classes += ' has-tasks';
        
        const dayElement = createDayElement(day, classes, date);
        calendarDays.appendChild(dayElement);
    }
    
    // Dias do próximo mês
    const totalDays = calendarDays.children.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, 'other-month', new Date(year, month + 1, day));
        calendarDays.appendChild(dayElement);
    }
}

// Cria elemento de dia do calendário
function createDayElement(day, classes, date) {
    const div = document.createElement('div');
    div.className = `calendar-day ${classes}`;
    div.textContent = day;
    div.onclick = () => selectDate(date);
    return div;
}

// Seleciona uma data
function selectDate(date) {
    selectedDate = new Date(date);
    renderCalendar();
    renderTasks();
    updateEmptyMessage();
    updateDateTitle();
}

// Navega para o mês anterior
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

// Navega para o próximo mês
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// Verifica se duas datas são o mesmo dia
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Obtém tarefas para uma data específica
function getTasksForDate(date) {
    return tasks.filter(task => isSameDay(new Date(task.date), date));
}

// Atualiza o título da data selecionada
function updateDateTitle() {
    const today = new Date();
    const title = document.getElementById('selectedDateTitle');
    
    if (isSameDay(selectedDate, today)) {
        title.textContent = 'Hoje';
    } else {
        const options = { day: 'numeric', month: 'long' };
        title.textContent = selectedDate.toLocaleDateString('pt-BR', options);
    }
}

// Adiciona nova tarefa
function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    
    if (text === '') {
        input.focus();
        return;
    }
    
    // Modo estudo: pega a matéria e tempo
    let subject = '';
    let studyMinutes = 0;
    let studyTimeValue = 0;
    let studyTimeUnit = 'min';
    let studyTimeDisplay = '';
    
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        const subjectInput = document.getElementById('subjectInput');
        subject = subjectInput.value.trim();
        if (subject === '') {
            subjectInput.focus();
            return;
        }
        
        const timeInput = document.getElementById('timeInput');
        const unitSelect = document.getElementById('timeUnit');
        
        studyTimeValue = parseInt(timeInput.value) || 0;
        studyTimeUnit = unitSelect.value;
        
        if (studyTimeValue <= 0) {
            timeInput.focus();
            return;
        }
        
        // Converte para minutos
        if (studyTimeUnit === 'hour') {
            studyMinutes = studyTimeValue * 60;
            studyTimeDisplay = studyTimeValue + 'h';
        } else {
            studyMinutes = studyTimeValue;
            studyTimeDisplay = studyTimeValue + ' min';
        }
    }
    
    // Modo fitness: pega o tempo e unidade
    let minutes = 0;
    let timeValue = 0;
    let timeUnit = 'min';
    let timeDisplay = '';
    
    if (isFitnessMode) {
        const timeInput = document.getElementById('timeInput');
        const unitSelect = document.getElementById('timeUnit');
        
        timeValue = parseInt(timeInput.value) || 0;
        timeUnit = unitSelect.value;
        
        if (timeValue <= 0) {
            timeInput.focus();
            return;
        }
        
        // Converte tudo para minutos para cálculo interno
        if (timeUnit === 'hour') {
            minutes = timeValue * 60;
            timeDisplay = timeValue + 'h';
        } else if (timeUnit === 'sec') {
            minutes = timeValue / 60;
            timeDisplay = timeValue + 's';
        } else {
            minutes = timeValue;
            timeDisplay = timeValue + ' min';
        }
    }
    
    const now = new Date();
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), now.getHours(), now.getMinutes()).toISOString(),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        minutes: isFitnessMode ? minutes : (typeof isStudyMode !== 'undefined' && isStudyMode ? studyMinutes : undefined),
        timeValue: isFitnessMode ? timeValue : (typeof isStudyMode !== 'undefined' && isStudyMode ? studyTimeValue : undefined),
        timeUnit: isFitnessMode ? timeUnit : (typeof isStudyMode !== 'undefined' && isStudyMode ? studyTimeUnit : undefined),
        timeDisplay: isFitnessMode ? timeDisplay : (typeof isStudyMode !== 'undefined' && isStudyMode ? studyTimeDisplay : undefined),
        subject: (typeof isStudyMode !== 'undefined' && isStudyMode) ? subject : undefined
    };
    
    tasks.push(task);
    saveTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    updateEmptyMessage();
    if (isFitnessMode) updateTotalTime();
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        updateSubjectsCount();
        updateStudyTime();
    }
    
    input.value = '';
    if (isFitnessMode) {
        document.getElementById('timeInput').value = '';
    }
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        document.getElementById('subjectInput').value = '';
        document.getElementById('timeInput').value = '';
        document.getElementById('subjectInput').focus();
    } else {
        input.focus();
    }
}

// Renderiza todas as tarefas da data selecionada
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '';
    
    const dateTasks = getTasksForDate(selectedDate);
    
    // Ordena por hora de criação (mais recente primeiro)
    dateTasks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    dateTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
}

// Cria elemento HTML da tarefa
function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    if (isFitnessMode && task.timeDisplay) {
        div.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
            >
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-minutes">${task.timeDisplay}</span>
            <button class="delete-button" onclick="deleteTask(${task.id})">×</button>
        `;
    } else if (isFitnessMode && task.minutes) {
        // Compatibilidade com tarefas antigas (só minutos)
        div.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
            >
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-minutes">${task.minutes} min</span>
            <button class="delete-button" onclick="deleteTask(${task.id})">×</button>
        `;
    } else if (typeof isStudyMode !== 'undefined' && isStudyMode && task.subject) {
        const hasTimer = !task.completed && !task.timeDisplay;
        div.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
            >
            <span class="task-subject">${escapeHtml(task.subject)}</span>
            <span class="task-text">${escapeHtml(task.text)}</span>
            ${task.timeDisplay ? `<span class="task-minutes">${task.timeDisplay}</span>` : ''}
            ${hasTimer ? `<button class="start-timer-btn" onclick="startTaskTimer(${task.id})">▶ Iniciar</button>` : ''}
            <button class="delete-button" onclick="deleteTask(${task.id})">×</button>
        `;
    } else {
        div.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
            >
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-time">${task.time}</span>
            <button class="delete-button" onclick="deleteTask(${task.id})">×</button>
        `;
    }
    
    return div;
}

// Marca/desmarca tarefa como concluída
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateStats();
        if (isFitnessMode) updateTotalTime();
        if (typeof isStudyMode !== 'undefined' && isStudyMode) {
            updateSubjectsCount();
            updateStudyTime();
        }
    }
}

// Deleta uma tarefa
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    updateEmptyMessage();
    if (isFitnessMode) updateTotalTime();
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        updateSubjectsCount();
        updateStudyTime();
    }
}

// Limpa todas as tarefas concluídas da data selecionada
function clearCompleted() {
    const dateTasks = getTasksForDate(selectedDate);
    const completedCount = dateTasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
        return;
    }
    
    tasks = tasks.filter(t => {
        if (isSameDay(new Date(t.date), selectedDate) && t.completed) {
            return false;
        }
        return true;
    });
    
    saveTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    updateEmptyMessage();
    if (isFitnessMode) updateTotalTime();
    if (typeof isStudyMode !== 'undefined' && isStudyMode) {
        updateSubjectsCount();
        updateStudyTime();
    }
}

// Atualiza o tempo total de treino (apenas modo fitness)
function updateTotalTime() {
    if (!isFitnessMode) return;
    
    const dateTasks = getTasksForDate(selectedDate);
    const completedTasks = dateTasks.filter(t => t.completed);
    const totalMinutes = completedTasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
    
    const totalTimeElement = document.getElementById('totalTime');
    if (totalTimeElement) {
        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            totalTimeElement.textContent = `${hours}h ${mins}min`;
        } else {
            totalTimeElement.textContent = `${totalMinutes} min`;
        }
    }
}

// Atualiza a contagem de matérias estudadas (apenas modo estudo)
function updateSubjectsCount() {
    if (typeof isStudyMode === 'undefined' || !isStudyMode) return;
    
    const dateTasks = getTasksForDate(selectedDate);
    const completedTasks = dateTasks.filter(t => t.completed && t.subject);
    const uniqueSubjects = new Set(completedTasks.map(t => t.subject.toLowerCase()));
    
    const subjectsCountElement = document.getElementById('subjectsCount');
    if (subjectsCountElement) {
        subjectsCountElement.textContent = uniqueSubjects.size;
    }
}

// Atualiza o tempo total de estudo (apenas modo estudo)
function updateStudyTime() {
    if (typeof isStudyMode === 'undefined' || !isStudyMode) return;
    
    const dateTasks = getTasksForDate(selectedDate);
    const completedTasks = dateTasks.filter(t => t.completed);
    const totalMinutes = completedTasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
    
    const totalStudyTimeElement = document.getElementById('totalStudyTime');
    if (totalStudyTimeElement) {
        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            if (mins > 0) {
                totalStudyTimeElement.textContent = `${hours}h ${mins}min`;
            } else {
                totalStudyTimeElement.textContent = `${hours}h`;
            }
        } else {
            totalStudyTimeElement.textContent = `${totalMinutes} min`;
        }
    }
}

// Atualiza as estatísticas
function updateStats() {
    const dateTasks = getTasksForDate(selectedDate);
    const total = dateTasks.length;
    const completed = dateTasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('progressPercent').textContent = percentage + '%';
    document.getElementById('progressFill').style.width = percentage + '%';
}

// Atualiza mensagem de lista vazia
function updateEmptyMessage() {
    const emptyMessage = document.getElementById('emptyMessage');
    const dateTasks = getTasksForDate(selectedDate);
    
    if (dateTasks.length === 0) {
        emptyMessage.classList.remove('hidden');
    } else {
        emptyMessage.classList.add('hidden');
    }
}

// Previne XSS escapando HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====== FUNÇÕES DO CRONÔMETRO (MODO ESTUDO) ======

// Inicia o cronômetro para uma tarefa existente
function startTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Armazena o ID da tarefa
    currentTimerTask = {
        taskId: taskId,
        subject: task.subject,
        text: task.text
    };
    
    // Mostra o cronômetro
    document.getElementById('timerSection').style.display = 'block';
    document.getElementById('timerSubject').textContent = task.subject;
    document.getElementById('timerTask').textContent = task.text;
    
    // Esconde o formulário
    document.querySelector('.add-task').style.display = 'none';
    
    // Inicia o cronômetro
    startTimer();
}

// Inicia o cronômetro
function startTimer() {
    timerSeconds = 0;
    timerPaused = false;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        if (!timerPaused) {
            timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

// Atualiza o display do cronômetro
function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    
    const display = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    
    document.getElementById('timerTime').textContent = display;
}

// Pausa/retoma o cronômetro
function pauseTimer() {
    const pauseBtn = document.getElementById('pauseBtn');
    timerPaused = !timerPaused;
    
    if (timerPaused) {
        pauseBtn.textContent = '▶ Retomar';
        pauseBtn.classList.add('resumed');
    } else {
        pauseBtn.textContent = '⏸ Pausar';
        pauseBtn.classList.remove('resumed');
    }
}

// Finaliza o cronômetro e salva a tarefa
function stopTimer() {
    if (!currentTimerTask) return;
    
    // Para o cronômetro
    clearInterval(timerInterval);
    timerInterval = null;
    
    // Calcula o tempo em minutos
    const totalMinutes = Math.ceil(timerSeconds / 60);
    
    // Cria o display do tempo
    let timeDisplay = '';
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        timeDisplay = mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    } else {
        timeDisplay = `${totalMinutes} min`;
    }
    
    // Encontra e atualiza a tarefa existente
    const task = tasks.find(t => t.id === currentTimerTask.taskId);
    if (task) {
        task.completed = true;
        task.minutes = totalMinutes;
        task.timeDisplay = timeDisplay;
    }
    
    saveTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    updateEmptyMessage();
    updateSubjectsCount();
    updateStudyTime();
    
    // Reseta o cronômetro
    timerSeconds = 0;
    timerPaused = false;
    currentTimerTask = null;
    
    // Esconde o cronômetro e mostra o formulário
    document.getElementById('timerSection').style.display = 'none';
    document.querySelector('.add-task').style.display = 'flex';
    document.getElementById('pauseBtn').textContent = '⏸ Pausar';
    document.getElementById('pauseBtn').classList.remove('resumed');
    
    // Foca no primeiro campo
    document.getElementById('subjectInput').focus();
}

