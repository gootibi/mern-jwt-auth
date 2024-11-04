import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

export const Home = () => {
  return <div>Home</div>
};

function App() {

  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/login' element={<Login />} />
      <Route path='/register' element={<Register />} />
    </Routes>
  )
}

export default App
