import { Route, Routes } from 'react-router-dom';
import AppContainer from './components/AppContainer';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

export const Home = () => {
  return <div>Home</div>
};

function App() {

  return (
    <Routes>
      <Route path='/' element={<AppContainer />} >
        <Route index path='/' element={<Profile />} />
      </Route>
      <Route path='/login' element={<Login />} />
      <Route path='/register' element={<Register />} />
      <Route path='/email/verify/:code' element={<VerifyEmail />} />
      <Route path='/password/forgot' element={<ForgotPassword />} />
      <Route path='/password/reset' element={<ResetPassword />} />
    </Routes>
  )
}

export default App
