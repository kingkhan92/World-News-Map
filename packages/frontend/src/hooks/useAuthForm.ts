import { useState } from 'react';
import { LoginRequest, RegisterRequest } from '../types/api';

interface UseAuthFormOptions {
  onSubmit: (data: LoginRequest | RegisterRequest) => Promise<void>;
  mode: 'login' | 'register';
}

export const useAuthForm = ({ onSubmit, mode }: UseAuthFormOptions) => {
  const [formData, setFormData] = useState<LoginRequest | RegisterRequest>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFormData({ email: '', password: '' });
    setError(null);
    setIsLoading(false);
  };

  return {
    formData,
    isLoading,
    error,
    handleChange,
    handleSubmit,
    reset,
  };
};

export default useAuthForm;