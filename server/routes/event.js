const router = require("express").Router();
const Club = require("../model/Club");
const Event = require("../model/Event");
const User = require("../model/User");
const verifyClubAdmin = require("../helper/verifyClubAdmin");

//create event
router.post("/", async (req, res) => { 
  try {
    const club = await Club.findOne({ _id: req.body.club });
    verifyClubAdmin(club, req.user);
    const event = new Event({ ...req.body });
    await event.save();
    club.events.push(event._id);
    await club.save();
    res.send(event);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

//get event details

router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id }).populate(
      "club prizes.winner"
    );
    const eventJSON = event.toJSON();
    res.send({
      ...eventJSON,
      prizes: eventJSON.prizes.map((prize) => ({
        ...prize,
        winnerEmail: prize.winner?.email,
      })),
    });
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

//get event participants
router.get("/:id/participants", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id }).populate(
      "participants"
    );

    res.send(event.participants);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

//delete event
// router.delete("/:id", async (req, res) => {
//   try {
//     const event = await Event.findOne({ _id: req.params.id });
//     const club = await Club.findOne({ _id: event.club });
//     verifyClubAdmin(club, req.user);
//     await event.deleteOne({ _id: req.params.id });
//     res.send({ success: true });
//   } catch (err) {
//     console.log(err);
//     res.status(400).send(err);
//   }
// });

router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Verify that the user has the necessary permissions to delete the event
    const club = await Club.findOne({ _id: event.club });
    verifyClubAdmin(club, req.user);

    // Delete the event from the club's events array
    const clubIndex = club.events.indexOf(event._id);
    if (clubIndex !== -1) {
      club.events.splice(clubIndex, 1);
      await club.save();
    }

    // Remove the event from participants' events arrays
    const participants = await User.find({ _id: { $in: event.participants } });
    for (const participant of participants) {
      const participantIndex = participant.participatedEvents.indexOf(event._id);
      if (participantIndex !== -1) {
        participant.participatedEvents.splice(participantIndex, 1);
        await participant.save();
      }
    }

    // Delete the event itself
    await event.deleteOne();

    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});


// update event
router.post("/:id", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id });
    const club = await Club.findOne({ _id: req.body.clubId });
    verifyClubAdmin(club, req.user);

    const { name, description, details, dates } = req.body;

    const prizesArray = req.body.prizes;
    delete req.body.prizes;
    event.prizes = []; // removes all elements from array

    for (const prize of prizesArray) {
      const email = prize.winnerEmail;
      const user = await User.findOne({ email }).exec();
      event.prizes.push({
        type: prize.type,
        amount: prize.amount,
        winner: user?._id,
      });
    }

    event.name = name;
    event.description = description;
    event.details = details;
    event.dates = dates;
    await event.save();
    res.send(event);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

//register in event or add Participants
router.post("/:id/register", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id });
    const participant = await User.findOne({ _id: req.user._id });
    if (!event.participants.includes(req.user._id)) {
      participant.participatedEvents.push(event._id);
      event.participants.push(req.user._id);
    }
    await event.save();
    await participant.save();
    res.send(event);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

//remove participants or leave event
// router.delete("/:id/participants", async (req, res) => {
//   try {
//     const event = await Event.findOne({ _id: req.params.id });
//     const participantId = req.body.participant;
//     const participant = await User.findOne({ _id: participantId });
//     event.participants = event.participants.filter(
//       (id) => id.toString() !== participantId
//     );

//     participant.participatedEvents = participant.participatedEvents.filter(
//       (id) => id.toString() !== event._id
//     );
//     await event.save();
//     await participant.save();
//     res.send(event);
//   } catch (err) {
//     console.log(err);
//     res.status(400).send({ error: err.message });
//   }
// });

router.delete("/:id/participants", async (req, res) => {
  try {
    // Find the event and participants
    const event = await Event.findOne({ _id: req.params.id });
    const participantId = req.body.participant;
    const participant = await User.findOne({ _id: participantId });

    if (!event || !participant) {
      return res.status(404).json({ error: "Event or participant not found" });
    }

    // Remove the participant from the participants array of the event
    event.participants = event.participants.filter(
      (id) => id.toString() !== participantId
    );

    // Remove the event from the participatedEvents array of the participant
    participant.participatedEvents = participant.participatedEvents.filter(
      (id) => id.toString() !== event._id.toString()
    );

    // Save the updated event and participant
    await event.save();
    await participant.save();

    res.send(event); // You can send any response as needed
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

//get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({}).populate("participants club");
    res.send(events);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

module.exports = router;
