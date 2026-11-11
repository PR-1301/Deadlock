import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../../pages/Admin.css'; // Reuse existing admin styles for theme consistency
import { adminLogin } from '../../api/adminAuth';

const AdminLogin = () => {
    const [searchParams] = useSearchParams();
    const expiredNotice = searchParams.get('expired') === '1'
        ? 'ADMIN SESSION EXPIRED — PLEASE RE-AUTHENTICATE'
        : '';
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(expiredNotice);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Passcode is verified by the backend, which returns a signed admin token
    const handleLogin = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError('');
        try {
            await adminLogin(passcode);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message === 'Failed to fetch' ? 'NETWORK INTERRUPT: SERVER UNREACHABLE' : err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-page-root" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="admin-scanlines"></div>
            <div className="admin-grid-overlay"></div>

            <div className="login-container" style={{
                zIndex: 20,
                padding: '3rem',
                background: 'rgba(10,10,10,0.9)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%',
                boxShadow: '0 0 40px rgba(0,0,0,0.8)'
            }}>
                <h1 style={{
                    fontFamily: 'Orbitron',
                    color: '#ffd700',
                    marginBottom: '2rem',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                }}>SYSTEM ACCESS</h1>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <input
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="ENTER PASSCODE"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 215, 0, 0.2)',
                            padding: '1rem',
                            color: '#fff',
                            fontFamily: 'Orbitron',
                            textAlign: 'center',
                            letterSpacing: '2px',
                            fontSize: '1.1rem',
                            outline: 'none'
                        }}
                    />

                    {error && <div style={{ color: '#ff003c', fontFamily: 'Orbitron', fontSize: '0.9rem' }}>{error}</div>}

                    <button
                        type="submit"
                        className="cyber-btn primary"
                        style={{ padding: '1rem' }}
                        disabled={submitting}
                    >
                        {submitting ? 'VERIFYING...' : 'AUTHENTICATE'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
