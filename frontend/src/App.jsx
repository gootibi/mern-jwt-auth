import { Route, Routes } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import AppContainer from './components/AppContainer';

export const Home = () => {
  return <div>Home</div>
};

function App() {

  return (
    <Routes>
      <Route path='/' element={<AppContainer />} >
        <Route index path='/' element={<Home />} />
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
