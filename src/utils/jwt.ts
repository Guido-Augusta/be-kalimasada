import jwt, { JwtPayload } from 'jsonwebtoken';

export interface JwtUserPayload extends JwtPayload {
  id: number;
  role: string;
  isMobile?: boolean;
}

const SECRET = process.env.JWT_SECRET || 'supersecret';

export const generateWebToken = (payload: Omit<JwtUserPayload, 'isMobile'>) => {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
};

export const generateMobileToken = (payload: Omit<JwtUserPayload, 'isMobile'>) => {
  const mobilePayload = { ...payload, isMobile: true };
  return jwt.sign(mobilePayload, SECRET);
};

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, SECRET) as JwtUserPayload;
};
