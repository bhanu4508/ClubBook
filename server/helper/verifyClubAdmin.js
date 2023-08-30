const verifyClubAdmin = (club , user) => {
    if (!user) {
        throw new Error("User not logged in");
    }
    // const allowed = user.superAdmin || club.admins.find((id) => id === user._id)
    // if (!allowed) {
    //     throw new Error("User is not a club admin");
    // }
    const isAdmin = user.superAdmin || club.admins.includes(user._id);

    if (!isAdmin) {
    // The user is an admin of the club
    throw new Error("User is not a club admin");
    }

}

module.exports = verifyClubAdmin;