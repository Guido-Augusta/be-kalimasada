import { UpdateUstadzPayload } from '../controllers/ustadzController';
import * as ustadzRepo from '../repositories/ustadzRepo';
import bcrypt from 'bcrypt';

export const registerUstadz = async (data: ustadzRepo.UstadzData) => {
  const hashed = await bcrypt.hash(data.password, 10);
  return ustadzRepo.createUstadz({ ...data, password: hashed });
};

export const getUstadzById = ustadzRepo.getUstadzById;
export const getUstadzByName = ustadzRepo.getUstadzByName;
export const deleteUstadz = ustadzRepo.deleteUstadz;

export const updateUstadzProfileAndUser = async (id: number, data: UpdateUstadzPayload) => {
  const { email, password, ...restData } = data;
  let hashed: string | undefined;
  if (password) {
    hashed = await bcrypt.hash(password, 10);
  }

  return ustadzRepo.updateUstadzAndUser(id, {
    ...restData,
    email,
    password: hashed
  });
};

export const getUstadzForAdmin = async (options: {
  waliKelasTahap?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 10;

  const { data, totalData } = await ustadzRepo.findUstadzWithPagination(
    { waliKelasTahap: options.waliKelasTahap, search: options.search },
    page,
    limit
  );

  const totalPages = Math.ceil(totalData / limit);

  return {
    pagination: { page, limit, totalData, totalPages },
    data,
  };
};
