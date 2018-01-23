// Saves options to chrome.storage.sync.
function save_options() {
    var notify = document.getElementById('notify').value;
    app.update_option({
        notify: notify
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Đã lưu';
        setTimeout(function() {
            status.textContent = '';
        }, 1750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    app.get_options().then(function(items) {
        document.getElementById('notify').value = items.notify;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);