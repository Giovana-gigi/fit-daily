const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database('./fitdaily.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        initDatabase();
    }
});

// Cria as tabelas se não existirem
function initDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            planner_type TEXT NOT NULL,
            task_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            minutes INTEGER,
            time_value INTEGER,
            time_unit TEXT,
            time_display TEXT,
            subject TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_email) REFERENCES users(email)
        )
    `);

    console.log('Tabelas criadas com sucesso!');
    
    // Cria o usuário admin padrão se não existir
    createDefaultAdmin();
}

// Cria o usuário admin padrão
async function createDefaultAdmin() {
    const adminEmail = 'gigi.coneg09@gmail.com';
    
    db.get('SELECT email FROM users WHERE email = ?', [adminEmail], async (err, row) => {
        if (!row) {
            const hashedPassword = await bcrypt.hash('12345Giovana', 10);
            db.run(
                'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
                ['Giovana Esmelardi', adminEmail, hashedPassword, 1],
                (err) => {
                    if (err) {
                        console.error('Erro ao criar admin:', err);
                    } else {
                        console.log('👑 Admin padrão criado: Giovana Esmelardi');
                    }
                }
            );
        }
    });
}

// ===== ROTAS DE AUTENTICAÇÃO =====

// Registro de usuário
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    try {
        // Verifica se o email já existe
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (row) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insere o novo usuário
            db.run(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Erro ao criar usuário' });
                    }
                    res.json({ 
                        success: true, 
                        message: 'Usuário criado com sucesso',
                        user: { name, email }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Login de usuário
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Email não encontrado' });
        }

        // Verifica a senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                isAdmin: user.is_admin === 1
            }
        });
    });
});

// ===== ROTAS DE TAREFAS =====

// Buscar todas as tarefas do usuário
app.get('/api/tasks/:email/:type', (req, res) => {
    const { email, type } = req.params;

    db.all(
        'SELECT * FROM tasks WHERE user_email = ? AND planner_type = ? ORDER BY date DESC',
        [email, type],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar tarefas' });
            }
            res.json(rows);
        }
    );
});

// Salvar tarefas (substituir todas)
app.post('/api/tasks/save', (req, res) => {
    const { email, type, tasks } = req.body;

    if (!email || !type || !tasks) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Deleta todas as tarefas antigas deste usuário e tipo
    db.run(
        'DELETE FROM tasks WHERE user_email = ? AND planner_type = ?',
        [email, type],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao deletar tarefas antigas' });
            }

            // Insere as novas tarefas
            const stmt = db.prepare(`
                INSERT INTO tasks (
                    user_email, planner_type, task_id, text, completed, 
                    date, time, minutes, time_value, time_unit, time_display, subject
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            tasks.forEach(task => {
                stmt.run(
                    email,
                    type,
                    task.id,
                    task.text,
                    task.completed ? 1 : 0,
                    task.date,
                    task.time,
                    task.minutes || null,
                    task.timeValue || null,
                    task.timeUnit || null,
                    task.timeDisplay || null,
                    task.subject || null
                );
            });

            stmt.finalize((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao salvar tarefas' });
                }
                res.json({ success: true, message: 'Tarefas salvas com sucesso' });
            });
        }
    );
});

// Rota para listar todos os usuários (admin)
app.get('/api/admin/users', (req, res) => {
    db.all('SELECT id, name, email, created_at FROM users', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }
        res.json(rows);
    });
});

// Rota para ver tarefas de um usuário específico (admin)
app.get('/api/admin/tasks/:email', (req, res) => {
    const { email } = req.params;
    
    db.all('SELECT * FROM tasks WHERE user_email = ? ORDER BY date DESC', [email], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar tarefas' });
        }
        res.json(rows);
    });
});

// Rota para deletar um usuário e suas tarefas (admin)
app.delete('/api/admin/user/:email', (req, res) => {
    const { email } = req.params;
    
    // Primeiro deleta todas as tarefas do usuário
    db.run('DELETE FROM tasks WHERE user_email = ?', [email], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar tarefas do usuário' });
        }
        
        // Depois deleta o usuário
        db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao deletar usuário' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            res.json({ success: true, message: 'Usuário deletado com sucesso' });
        });
    });
});

// Rota principal redireciona para login
app.get('/', (req, res) => {
    res.redirect('/html/login.html');
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Banco de dados: fitdaily.db`);
});

// Fecha o banco de dados quando o servidor é encerrado
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Banco de dados fechado');
        process.exit(0);
    });
});
