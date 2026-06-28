import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
    Bell,
    Check,
    ClipboardList,
    LogOut,
    MessageSquare,
    Plus,
    RefreshCw,
    Send,
    Trash2,
    Users,
} from "lucide-react";

const API_URL = "http://localhost:5000";

const columns = [
    { id: "todo", label: "Todo" },
    { id: "in-progress", label: "In Progress" },
    { id: "done", label: "Done" },
];

const emptyAuth = {
    name: "",
    email: "",
    password: "",
};

function App() {
    const [token, setToken] = useState(() => localStorage.getItem("token") || "");
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState(emptyAuth);
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [messages, setMessages] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [workspaceForm, setWorkspaceForm] = useState({ name: "", description: "" });
    const [taskForm, setTaskForm] = useState({ title: "", priority: "medium" });
    const [memberEmail, setMemberEmail] = useState("");
    const [chatText, setChatText] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const api = useMemo(() => {
        return axios.create({
            baseURL: API_URL,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
    }, [token]);

    useEffect(() => {
        if (!token) {
            return;
        }

        loadInitialData();
    }, [token]);

    useEffect(() => {
        if (!token || !activeWorkspace) {
            return;
        }

        const socket = io(API_URL, {
            auth: { token },
        });

        socket.emit("joinUser");
        socket.emit("joinWorkspace", activeWorkspace._id);

        socket.on("taskCreated", (task) => {
            setTasks((current) => [task, ...current.filter((item) => item._id !== task._id)]);
            loadStats(activeWorkspace._id);
        });

        socket.on("taskUpdated", (task) => {
            setTasks((current) => current.map((item) => (item._id === task._id ? task : item)));
            loadStats(activeWorkspace._id);
        });

        socket.on("taskDeleted", ({ taskId }) => {
            setTasks((current) => current.filter((task) => task._id !== taskId));
            loadStats(activeWorkspace._id);
        });

        socket.on("messageCreated", (message) => {
            setMessages((current) => [...current, message]);
        });

        socket.on("notificationCreated", (notification) => {
            setNotifications((current) => [notification, ...current]);
        });

        return () => {
            socket.emit("leaveWorkspace", activeWorkspace._id);
            socket.disconnect();
        };
    }, [token, activeWorkspace?._id]);

    const showError = (message) => {
        setError(message);
        window.setTimeout(() => setError(""), 4000);
    };

    const handleAuth = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
            const payload =
                authMode === "login"
                    ? { email: authForm.email, password: authForm.password }
                    : authForm;
            const { data } = await axios.post(`${API_URL}${path}`, payload);

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            setAuthForm(emptyAuth);
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const loadInitialData = async () => {
        try {
            const [workspaceResponse, notificationResponse] = await Promise.all([
                api.get("/api/workspaces"),
                api.get("/api/notifications"),
            ]);

            setWorkspaces(workspaceResponse.data.workspaces);
            setNotifications(notificationResponse.data.notifications);

            if (!activeWorkspace && workspaceResponse.data.workspaces.length > 0) {
                selectWorkspace(workspaceResponse.data.workspaces[0]);
            }
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not load dashboard");
        }
    };

    const selectWorkspace = async (workspace) => {
        setActiveWorkspace(workspace);
        try {
            const [taskResponse, messageResponse, statsResponse] = await Promise.all([
                api.get(`/api/workspaces/${workspace._id}/tasks`),
                api.get(`/api/workspaces/${workspace._id}/messages`),
                api.get(`/api/workspaces/${workspace._id}/tasks/stats`),
            ]);

            setTasks(taskResponse.data.tasks);
            setMessages(messageResponse.data.messages);
            setStats(statsResponse.data);
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not load workspace");
        }
    };

    const loadStats = async (workspaceId) => {
        try {
            const { data } = await api.get(`/api/workspaces/${workspaceId}/tasks/stats`);
            setStats(data);
        } catch {
            setStats(null);
        }
    };

    const createWorkspace = async (event) => {
        event.preventDefault();
        try {
            const { data } = await api.post("/api/workspaces", workspaceForm);
            setWorkspaces((current) => [data.workspace, ...current]);
            setWorkspaceForm({ name: "", description: "" });
            selectWorkspace(data.workspace);
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not create workspace");
        }
    };

    const addMember = async (event) => {
        event.preventDefault();
        if (!activeWorkspace) {
            return;
        }

        try {
            const { data } = await api.post(`/api/workspaces/${activeWorkspace._id}/members`, {
                email: memberEmail,
            });
            setActiveWorkspace(data.workspace);
            setWorkspaces((current) =>
                current.map((workspace) =>
                    workspace._id === data.workspace._id ? data.workspace : workspace
                )
            );
            setMemberEmail("");
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not add member");
        }
    };

    const createTask = async (event) => {
        event.preventDefault();
        if (!activeWorkspace) {
            return;
        }

        try {
            await api.post(`/api/workspaces/${activeWorkspace._id}/tasks`, taskForm);
            setTaskForm({ title: "", priority: "medium" });
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not create task");
        }
    };

    const updateTaskStatus = async (task, status) => {
        try {
            await api.put(`/api/workspaces/${activeWorkspace._id}/tasks/${task._id}`, { status });
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not update task");
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await api.delete(`/api/workspaces/${activeWorkspace._id}/tasks/${taskId}`);
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not delete task");
        }
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!activeWorkspace || !chatText.trim()) {
            return;
        }

        try {
            await api.post(`/api/workspaces/${activeWorkspace._id}/messages`, {
                content: chatText,
            });
            setChatText("");
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not send message");
        }
    };

    const markAllNotifications = async () => {
        try {
            await api.put("/api/notifications/read-all");
            setNotifications((current) =>
                current.map((notification) => ({ ...notification, isRead: true }))
            );
        } catch (apiError) {
            showError(apiError.response?.data?.message || "Could not update notifications");
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken("");
        setUser(null);
        setActiveWorkspace(null);
        setWorkspaces([]);
        setTasks([]);
        setMessages([]);
        setNotifications([]);
    };

    if (!token) {
        return (
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
                                <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-8">
                                    <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                                        <div className="flex flex-col justify-center">
                                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                                <ClipboardList size={24} />
                                            </div>
                                            <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
                                                Team workspace for placement preparation
                                            </h1>
                                            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                                                Manage workspaces, Kanban tasks, chat, notifications,
                                                and live updates from one focused collaboration
                                                dashboard.
                                            </p>
                                        </div>

                                        <form
                                            onSubmit={handleAuth}
                                            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                                        >
                                            <div className="mb-6 flex rounded-md bg-slate-100 p-1">
                                                {["login", "register"].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setAuthMode(mode)}
                                                        className={`flex-1 rounded px-3 py-2 text-sm font-medium capitalize ${
                                                            authMode === mode
                                                                ? "bg-white text-slate-950 shadow-sm"
                                                                : "text-slate-500"
                                                        }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>

                                            {authMode === "register" && (
                                                <label className="mb-4 block text-sm font-medium text-slate-700">
                                                    Name
                                                    <input
                                                        value={authForm.name}
                                                        onChange={(event) =>
                                                            setAuthForm({
                                                                ...authForm,
                                                                name: event.target.value,
                                                            })
                                                        }
                                                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                                                        placeholder="Your name"
                                                    />
                                                </label>
                                            )}

                                            <label className="mb-4 block text-sm font-medium text-slate-700">
                                                Email
                                                <input
                                                    type="email"
                                                    value={authForm.email}
                                                    onChange={(event) =>
                                                        setAuthForm({
                                                            ...authForm,
                                                            email: event.target.value,
                                                        })
                                                    }
                                                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                                                    placeholder="you@example.com"
                                                />
                                            </label>

                                            <label className="mb-5 block text-sm font-medium text-slate-700">
                                                Password
                                                <input
                                                    type="password"
                                                    value={authForm.password}
                                                    onChange={(event) =>
                                                        setAuthForm({
                                                            ...authForm,
                                                            password: event.target.value,
                                                        })
                                                    }
                                                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600"
                                                    placeholder="Minimum 6 characters"
                                                />
                                            </label>

                                            {error && (
                                                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                                                    {error}
                                                </p>
                                            )}

                                            <button
                                                disabled={loading}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                                            >
                                                {loading && (
                                                    <RefreshCw className="animate-spin" size={16} />
                                                )}
                                                {authMode === "login"
                                                    ? "Sign in"
                                                    : "Create account"}
                                            </button>
                                        </form>
                                    </div>
                                </section>
                            </main>
                        }
                    />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<main className="min-h-screen bg-[#f7f8fb] text-slate-950">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Placement Workspace</p>
                            <p className="text-xs text-slate-500">{user?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[280px_1fr_340px]">
                <aside className="space-y-4">
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Workspaces</h2>
                            <Users size={16} className="text-slate-500" />
                        </div>
                        <form onSubmit={createWorkspace} className="space-y-2">
                            <input
                                value={workspaceForm.name}
                                onChange={(event) =>
                                    setWorkspaceForm({
                                        ...workspaceForm,
                                        name: event.target.value,
                                    })
                                }
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                                placeholder="Workspace name"
                            />
                            <input
                                value={workspaceForm.description}
                                onChange={(event) =>
                                    setWorkspaceForm({
                                        ...workspaceForm,
                                        description: event.target.value,
                                    })
                                }
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                                placeholder="Description"
                            />
                            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                                <Plus size={16} />
                                Create
                            </button>
                        </form>
                        <div className="mt-4 space-y-2">
                            {workspaces.map((workspace) => (
                                <button
                                    key={workspace._id}
                                    onClick={() => selectWorkspace(workspace)}
                                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                                        activeWorkspace?._id === workspace._id
                                            ? "border-emerald-600 bg-emerald-50"
                                            : "border-slate-200 bg-white"
                                    }`}
                                >
                                    <span className="block font-medium">{workspace.name}</span>
                                    <span className="block truncate text-xs text-slate-500">
                                        {workspace.description || "No description"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {activeWorkspace && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold">Members</h2>
                            <form onSubmit={addMember} className="flex gap-2">
                                <input
                                    value={memberEmail}
                                    onChange={(event) => setMemberEmail(event.target.value)}
                                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                                    placeholder="email"
                                />
                                <button className="rounded-md bg-slate-950 px-3 py-2 text-white">
                                    <Plus size={16} />
                                </button>
                            </form>
                            <p className="mt-3 text-xs text-slate-500">
                                {activeWorkspace.members?.length || 0} members
                            </p>
                        </section>
                    )}
                </aside>

                <section className="min-w-0 space-y-4">
                    {error && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-semibold">
                                    {activeWorkspace?.name || "Create a workspace"}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {activeWorkspace?.description ||
                                        "Your task board appears after selecting a workspace."}
                                </p>
                            </div>
                            {stats && (
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                    <Metric label="Total" value={stats.total} />
                                    <Metric label="Todo" value={stats.byStatus.todo} />
                                    <Metric label="Active" value={stats.byStatus.inProgress} />
                                    <Metric label="Done" value={stats.byStatus.done} />
                                </div>
                            )}
                        </div>
                    </div>

                    {activeWorkspace && (
                        <>
                            <form
                                onSubmit={createTask}
                                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 md:flex-row"
                            >
                                <input
                                    value={taskForm.title}
                                    onChange={(event) =>
                                        setTaskForm({ ...taskForm, title: event.target.value })
                                    }
                                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                                    placeholder="Add a task"
                                />
                                <select
                                    value={taskForm.priority}
                                    onChange={(event) =>
                                        setTaskForm({ ...taskForm, priority: event.target.value })
                                    }
                                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                                <button className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                                    <Plus size={16} />
                                    Add
                                </button>
                            </form>

                            <div className="grid gap-4 xl:grid-cols-3">
                                {columns.map((column) => (
                                    <TaskColumn
                                        key={column.id}
                                        column={column}
                                        tasks={tasks.filter((task) => task.status === column.id)}
                                        onMove={updateTaskStatus}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <aside className="space-y-4">
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
                                <Bell size={16} />
                                Notifications
                            </h2>
                            <button
                                onClick={markAllNotifications}
                                className="rounded-md border border-slate-300 p-2 text-slate-600"
                                title="Mark all as read"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                        <div className="max-h-52 space-y-2 overflow-auto">
                            {notifications.length === 0 && (
                                <p className="text-sm text-slate-500">No notifications yet.</p>
                            )}
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`rounded-md border px-3 py-2 text-sm ${
                                        notification.isRead
                                            ? "border-slate-200 bg-white"
                                            : "border-amber-200 bg-amber-50"
                                    }`}
                                >
                                    {notification.message}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                            <MessageSquare size={16} />
                            Chat
                        </h2>
                        <div className="mb-3 flex h-72 flex-col gap-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                            {!activeWorkspace && (
                                <p className="text-sm text-slate-500">Select a workspace to chat.</p>
                            )}
                            {messages.map((message) => (
                                <div key={message._id} className="rounded-md bg-white px-3 py-2 shadow-sm">
                                    <p className="text-xs font-semibold text-slate-600">
                                        {message.sender?.name || "Team member"}
                                    </p>
                                    <p className="text-sm text-slate-800">{message.content}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                value={chatText}
                                onChange={(event) => setChatText(event.target.value)}
                                disabled={!activeWorkspace}
                                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-100"
                                placeholder="Message"
                            />
                            <button className="rounded-md bg-emerald-600 px-3 py-2 text-white">
                                <Send size={16} />
                            </button>
                        </form>
                    </section>
                </aside>
            </div>
        </main>} />
            </Routes>
        </BrowserRouter>
    );
}

function Metric({ label, value }) {
    return (
        <div className="min-w-14 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="font-semibold text-slate-950">{value}</p>
            <p className="text-slate-500">{label}</p>
        </div>
    );
}

function TaskColumn({ column, tasks, onMove, onDelete }) {
    return (
        <section className="min-h-96 rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{column.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {tasks.length}
                </span>
            </div>
            <div className="space-y-3">
                {tasks.map((task) => (
                    <article key={task._id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold">{task.title}</h3>
                                <p className="mt-1 text-xs capitalize text-slate-500">
                                    {task.priority} priority
                                </p>
                            </div>
                            <button
                                onClick={() => onDelete(task._id)}
                                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete task"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {columns.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onMove(task, item.id)}
                                    className={`h-7 flex-1 rounded border text-xs ${
                                        task.status === item.id
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 text-slate-500"
                                    }`}
                                    title={`Move to ${item.label}`}
                                >
                                    {item.label.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default App;
