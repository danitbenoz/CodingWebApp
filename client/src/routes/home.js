import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    // Use React Router's navigate function to navigate to the desired path
    navigate('/JoinRoom'); // Replace with the actual route path
  };

  return (
    <div>
      <center>
      <h1>Choose code block</h1>
      <p><button onClick={handleNavigate}>block 1</button></p>
      <p><button onClick={handleNavigate}>block 2</button></p>
      <p><button onClick={handleNavigate}>block 3</button></p>
      <p><button onClick={handleNavigate}>block 4</button></p>
      </center>
    </div>
  );
};

export default Home;