// Carrega o nome do usuário
window.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('currentUser');
    const userName = localStorage.getItem('userName');
    const isAdmin = localStorage.getItem('isAdmin');
    
    if (currentUser && userName) {
        document.getElementById('userName').textContent = `Olá, ${userName}`;
        
        // Mostra botão de admin se for admin
        if (isAdmin === 'true') {
            document.getElementById('adminBtn').style.display = 'inline-block';
        }
    }
});

// Função de logout
function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'html/login.html';
    }
}

// Função para o botão Fitness
function handleFitnessClick() {
    // Adiciona efeito de clique
    const button = event.target;
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        button.style.transform = '';
    }, 150);

    // Você pode adicionar a navegação ou ação desejada aqui
    console.log('Botão Fitness clicado!');
    
    // Exemplo: redirecionar para outra página
    // window.location.href = 'fitness.html';
    
    // Ou mostrar um alerta
    alert('Bem-vindo à seção Fitness! 💪');
}

// Função para o botão Daily
function handleDailyClick() {
    // Adiciona efeito de clique
    const button = event.target;
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        button.style.transform = '';
    }, 150);

    // Você pode adicionar a navegação ou ação desejada aqui
    console.log('Botão Daily clicado!');
    
    // Exemplo: redirecionar para outra página
    // window.location.href = 'daily.html';
    
    // Ou mostrar um alerta
    alert('Bem-vindo à seção Daily! 📅');
}

// Adiciona efeito de paralaxe suave ao mover o mouse
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.card');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    cards.forEach((card, index) => {
        const speed = (index + 1) * 2;
        const offsetX = (x - 0.5) * speed;
        const offsetY = (y - 0.5) * speed;
        
        card.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });
});

// Reseta a posição dos cards quando o mouse sai da janela
document.addEventListener('mouseleave', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.transform = '';
    });
});

// Animação de entrada quando a página carrega
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});
