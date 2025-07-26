import Technician from '../models/Technician.js';

export const getTechnicians = async (req, res) => {
  try {
    const technicians = await Technician.find();
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createTechnician = async (req, res) => {
  try {
    const { name, email, phone, specialization } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    if (!specialization) return res.status(400).json({ error: 'Specialization is required' });
    
    const existsName = await Technician.findOne({ name });
    if (existsName) return res.status(400).json({ error: 'Technician name must be unique' });
    
    const existsEmail = await Technician.findOne({ email });
    if (existsEmail) return res.status(400).json({ error: 'Email already exists' });
    
    const technician = new Technician({ name, email, phone, specialization });
    await technician.save();
    res.status(201).json(technician);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTechnician = async (req, res) => {
  try {
    const { name, email, phone, specialization } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    if (!specialization) return res.status(400).json({ error: 'Specialization is required' });
    
    const technician = await Technician.findByIdAndUpdate(
      req.params.id, 
      { name, email, phone, specialization }, 
      { new: true }
    );
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTechnician = async (req, res) => {
  try {
    const technician = await Technician.findByIdAndDelete(req.params.id);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json({ message: 'Technician deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
