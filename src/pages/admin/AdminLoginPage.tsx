import React, { useState } from 'react';
import { SpinnerIcon } from '../../components/Icons';
import { useToast } from '../../components/Toast';
import getSupabaseClient from '../../lib/supabase';

interface AdminLoginPageProps {
    onLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        setIsLoading(true);
    try {
            const supabase = getSupabaseClient();
            // treat username field as email for Supabase auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password,
            });
            if (error) {
        try { showToast(error.message || 'Invalid login credentials', 'error'); } catch {}
        setIsLoading(false);
        return;
            }
            // Successful sign-in: call onLogin and let App sync session
            onLogin();
        try { showToast('Berhasil login', 'success'); } catch {}
        } catch (err: any) {
        try { showToast(err?.message ?? 'Login error', 'error'); } catch {}
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="login-card">
                <h1>Admin Login</h1>
                <form className="login-form" onSubmit={handleSubmit}>
                    {/* inline error removed; using global toast for consistent messages */}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className={`btn btn-primary btn-large ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                        {isLoading && <SpinnerIcon />}
                        <span>Login</span>
                    </button>
                </form>
            </div>
        </div>
    );
};