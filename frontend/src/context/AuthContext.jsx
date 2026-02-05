import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = localStorage.getItem('jaagrmind_user');
        const storedToken = localStorage.getItem('jaagrmind_token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        setLoading(false);
    }, []);

    const login = async (credentials, role) => {
        try {
            let response;

            // Unified login uses email domain-based routing
            if (role === 'unified') {
                response = await api.post('/api/auth/login', credentials);
            } else if (role === 'admin') {
                response = await api.post('/api/admin/login', credentials);
            } else if (role === 'school') {
                response = await api.post('/api/school/login', credentials);
            } else if (role === 'student') {
                response = await api.post('/api/student/login', credentials);
            }

            const { token, ...userData } = response.data;

            localStorage.setItem('jaagrmind_token', token);
            localStorage.setItem('jaagrmind_user', JSON.stringify(userData));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('jaagrmind_token');
        localStorage.removeItem('jaagrmind_user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('jaagrmind_user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isSchool: user?.role === 'school',
        isStudent: user?.role === 'student'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
