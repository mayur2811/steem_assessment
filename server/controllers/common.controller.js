const mongoose = require('mongoose');
const state_model = require('../models/state');
const city_model = require('../models/city');
const users = require('../models/users');

module.exports = {
  getStateList: (req, res) => {
    state_model.find({ is_active: true })
      .exec((err, data) => {
        if (err)
          res.status(400).send(err);
        else
          res.status(200).send(data);
      });
  },
  addState: (req, res) => {
    const state = new state_model();
    state.name = req.body.name;

    state.save((err) => {
      if (err)
        res.status(400).send(err);
      else
        res.json({ message: 'State added successfully' });
    })
  },
  getAllCities: (req, res) => {
    city_model.find({ is_active: true })
      .populate('state_id', 'name')
      .exec((err, data) => {
        if (err)
          res.status(400).send(err);
        else
          res.status(200).json(data);
      });
  },
  getCityList: (req, res) => {
    city_model.find({ state_id: req.params.state_id, is_active: true })
      .populate('state_id', 'name')
      .exec((err, data) => {
        if (err)
          res.status(400).send(err);
        else
          res.status(200).json(data);
      });
  },
  addCity: async (req, res) => {
    try {
      const city = new city_model(req.body);
      const result = await city.save();
      if (result) res.status(200).json({ message: 'City added successfully' });
      else throw new Error('Something Went Wrong');
    }
    catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
  removeCity: (req, res) => {
    city_model.deleteOne({ _id: req.params.cityId }, (err, result) => {
      if (err)
        res.status(400).send(err);
      else
        res.status(200).json({ message: 'City removed successfully', data: result });
    })
  },
  checkemailAvailability: (req, res) => {
    const email = req.params.email;

    users.find({ email: email }, (err, result) => {
      if (err)
        res.status(400).send(err);
      else if (result.length > 0)
        res.status(200).json({ response: true });
      else
        res.status(200).json({ response: false });
    });
  }
}