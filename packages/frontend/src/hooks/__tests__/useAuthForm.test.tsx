import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuthForm } from '../useAuthForm';

describe('useAuthForm', () => {
  it('initializes with empty form data', () => {
    const { result } = renderHook(() => useAuthForm());
    
    expect(result.current.formData).toEqual({
      email: '',
      password: '',
      confirmPassword: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('updates form data when handleChange is called', () => {
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });
    
    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('validates email format', () => {
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('email', 'invalid-email');
    });
    
    act(() => {
      result.current.validateForm();
    });
    
    expect(result.current.errors.email).toBe('Please enter a valid email address');
  });

  it('validates password length', () => {
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('password', '123');
    });
    
    act(() => {
      result.current.validateForm();
    });
    
    expect(result.current.errors.password).toBe('Password must be at least 6 characters long');
  });

  it('validates password confirmation', () => {
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('password', 'password123');
      result.current.handleChange('confirmPassword', 'different123');
    });
    
    act(() => {
      result.current.validateForm();
    });
    
    expect(result.current.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('returns true for valid form', () => {
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'password123');
      result.current.handleChange('confirmPassword', 'password123');
    });
    
    let isValid;
    act(() => {
      isValid = result.current.validateForm();
    });
    
    expect(isValid).toBe(true);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('handles form submission', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'password123');
    });
    
    await act(async () => {
      await result.current.handleSubmit(mockSubmit);
    });
    
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: '',
    });
  });

  it('sets submitting state during form submission', async () => {
    const mockSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { result } = renderHook(() => useAuthForm());
    
    act(() => {
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'password123');
    });
    
    const submitPromise = act(async () => {
      await result.current.handleSubmit(mockSubmit);
    });
    
    expect(result.current.isSubmitting).toBe(true);
    
    await submitPromise;
    
    expect(result.current.isSubmitting).toBe(false);
  });
});