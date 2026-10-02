import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from '../utils/store';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = Store.get('currentUser');
    const profile = Store.get('profile');

    if (user && user.loggedIn) {
      if (user.role === 'faculty') {
        navigate('/faculty-dashboard');
      } else {
        const hasCompleted = Boolean(
          user.hasCompletedProfile ||
          profile?.hasCompletedProfile ||
          (profile?.skills && Object.keys(profile.skills).length > 0)
        );
        if (hasCompleted) {
          navigate('/dashboard');
        } else {
          navigate('/profile');
        }
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return null;
}
