module.exports = async function () {
    await timeout(3000);
    return 'success';
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}