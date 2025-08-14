import React, { useState, useEffect } from 'react';
import './InputField.css';

const InputField = ({ label, value = '', selectedRoles = [], apiError = false, onInputChange, onRolesChange }) => {
  const [userInput, setUserInput] = useState(value);
  const [localSelectedRoles, setLocalSelectedRoles] = useState(selectedRoles);

  const roles = ['TOP', 'JGL', 'MID', 'BOT', 'SUP', 'FILL'];

  // Update local state when props change
  useEffect(() => {
    setUserInput(value);
  }, [value]);

  useEffect(() => {
    setLocalSelectedRoles(selectedRoles);
  }, [selectedRoles]);

  // Validation function
  const validateInput = (input) => {
    if (!input.trim()) return { isValid: true, message: '' }; // Empty input is valid
    
    const parts = input.split('#');
    if (parts.length !== 2) {
      return { isValid: false, message: 'Name format not valid' };
    }
    
    const [string1, string2] = parts;
    if (string2.length < 1 || string2.length > 5) {
      return { isValid: false, message: 'Name format not valid' };
    }
    
    return { isValid: true, message: '' };
  };

  const handleRoleToggle = (role) => {
    const newSelectedRoles = localSelectedRoles.includes(role) 
      ? localSelectedRoles.filter(r => r !== role)
      : [...localSelectedRoles, role];
    
    setLocalSelectedRoles(newSelectedRoles);
    if (onRolesChange) {
      onRolesChange(newSelectedRoles);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setUserInput(value);
    if (onInputChange) {
      onInputChange(value);
    }
  };

  const validation = validateInput(userInput);
  const hasError = !validation.isValid || apiError;

  return (
    <div className="input-field">
      <div className="label-container">
        <label className={`input-label ${hasError ? 'invalid' : ''}`}>
          {label}
        </label>
        {!validation.isValid && (
          <span className="warning-text">{validation.message}</span>
        )}
        {apiError && (
          <span className="warning-text">Player not found (404)</span>
        )}
      </div>
      
      <input
        type="text"
        placeholder="Enter input..."
        value={userInput}
        onChange={handleInputChange}
        className={`text-input ${hasError ? 'invalid' : ''}`}
      />
      
      <div className="roles-container">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => handleRoleToggle(role)}
            className={`role-button ${localSelectedRoles.includes(role) ? 'selected' : ''}`}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InputField;
