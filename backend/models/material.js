import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    thermalConductivity: { type: Number, required: true }, 
    specificHeat: { type: Number, required: true },          
    density: { type: Number, required: true },              
    costPerUnit: { type: Number, required: true }            
});

export default mongoose.model('Material', materialSchema);