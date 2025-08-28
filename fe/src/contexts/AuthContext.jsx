import React, {createContext, useContext, useState, useEffect} from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await api.get('/api/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    localStorage.removeItem('token');
                    setToken(null);
                    delete api.defaults.headers.common['Authorization'];
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    const login = async (userId, password) => {
        try {
            const response = await api.post('/api/auth/login', {userId, password});
            const {token: newToken, user: userData} = response.data;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            return {success: true, user: userData};
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        isReviewer: user?.role === 'REVIEWER',
        isUploader: user?.role === 'UPLOADER',
        isAdmin: user?.role === 'ADMIN',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
