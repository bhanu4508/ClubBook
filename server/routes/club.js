const router = require("express").Router();
const Club = require("../model/Club");
const User = require("../model/User");
const Event = require("../model/Event");
const checkSuperAdmin = require("../helper/checkSuperAdmin");
const verifyClubAdmin = require("../helper/verifyClubAdmin");

// create a new club (only super admin )
router.post("/", checkSuperAdmin, async (req, res) => {
  try {
    const { name, admin_emails } = req.body;
    const admins = [];
    for (const email of admin_emails) {
      const user = await User.findOne({ email }).exec();
      if (!admins.includes(user._id)) admins.push(user._id);
    }

    const club = new Club({ name, admins });
    await club.save();
    for (const admin of admins) {
      const user = await User.findOne({ _id: admin });
      user.adminOfClub.push(club._id);
      await user.save();
    }

    res.send(club);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

// get details of requested club
router.get("/:id", async (req, res) => {
  try {
    const club = await Club.findOne({ _id: req.params.id }).populate(
      "admins events"
    );
    res.send(club);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

// delete the given club
// router.delete("/:id", async (req, res) => {
//   try {
//     const club = await Club.findOne({ _id: req.params.id });
//     verifyClubAdmin(club, req.user);

//     await Club.deleteOne({ _id: req.params.id });

//     res.send({ success: true });
//   } catch (err) {
//     console.log(err);
//     res.status(400).send(err);
//   }
// });
router.delete("/:id", async (req, res) => {
  try {
    const club = await Club.findOne({ _id: req.params.id });
    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // Get the admins and events associated with the club
    const admins = club.admins;
    const clubEvents = club.events;

    // Remove the club from the adminOfClub array of each admin
    await User.updateMany(
      { _id: { $in: admins } },
      { $pull: { adminOfClub: club._id } }
    );

    // Iterate through each event associated with the club
    for (const eventId of clubEvents) {
      // Find the event
      const event = await Event.findOne({ _id: eventId });

      if (event) {
        // Get the participants of the event
        const participants = event.participants;

        // Remove the event from the participatedEvents array of each participant
        await User.updateMany(
          { _id: { $in: participants } },
          { $pull: { participatedEvents: eventId } }
        );

        // You can also delete the event if needed
        await event.deleteOne();
      }
    }

    // Delete the club itself
    await Club.deleteOne({ _id: req.params.id });

    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});



// router.delete("/:id", async (req, res) => {

//   try {
//     const club = await Club.findOne({ _id: req.params.id });
//     if (!club) {
//       return res.status(404).json({ error: "Club not found" });
//     }
//     // Verify that the user has the necessary permissions to delete the club
//     verifyClubAdmin(club, req.user);

//     // Find and delete all events associated with the club
//     const eventIds = club.events;
//     for (const ids of eventIds) {
//       // Remove the event from participants' events arrays
//       const event = await Event.findOne({_id:ids});
//       console.log(event);
//       const participants = event.participants;
//       for (const participant_id of participants) {
//         // const participantIndex = participant.participatedEvents.indexOf(event._id);
//         // if (participantIndex !== -1) {
//         //   participant.participatedEvents.splice(participantIndex, 1);
//         //   await participant.save();
//         // }
//         const user = User.findById(participant_id);
        
//         user.participatedEvents = user.participatedEvents.filter(item => item !== ids);


//         user.save();

//       }
//       // Delete the event
//       await event.deleteOne();
//     }

//     // Delete the club itself
//     await club.deleteOne();

//     res.send({ success: true });
//   } catch (err) {
//     console.log(err);
//     res.status(400).send(err);
//   }
// });


// update club name
router.post("/:id", async (req, res) => {
  try {
    const club = await Club.findOne({ _id: req.params.id });
    verifyClubAdmin(club, req.user);
    const { name } = req.body;
    club.name = name;
    await club.save();
    res.send(club);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

// add admin to club
router.post("/:id/admin", async (req, res) => {
  try {
    const club = await Club.findOne({ _id: req.params.id });
    verifyClubAdmin(club, req.user);
    const { admin_emails } = req.body;

    const admins = club.admins.map((id) => id.toString());

    for (const email of admin_emails) {
      const user = await User.findOne({ email }).exec();
      const id = user._id.toString();
      if (!admins.includes(id)) {
        admins.push(id);
        user.adminOfClub.push(club._id);
        await user.save();
      }
    }

    club.admins = admins;
    await club.save();
    res.send(club);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

// remove admin from club
router.delete("/:clubId/admin/:userId", async (req, res) => {
  try {
    const club = await Club.findOne({ _id: req.params.clubId });
    verifyClubAdmin(club, req.user);

    const admin_id = req.params.userId;
    const user = await User.findOne({ _id: admin_id });
    club.admins = club.admins.filter((id) => id.toString() !== admin_id);

    user.adminOfClub = user.adminOfClub.filter(
      (id) => id.toString() !== req.params.clubId
    );
    await club.save();
    await user.save();
    res.send(club);
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
});

// get all club details  for dashborad
router.get("/", async (req, res) => {
  try {
    const clubs = await Club.find({}).populate("admins events");
    res.send(clubs);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

module.exports = router;
