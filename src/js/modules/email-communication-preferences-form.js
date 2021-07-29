/**
 * Functionality of email subscription preferences form. Disables checkbox access from other choices if user wants to unsubscribe.
 */

const emailCommunicationPreferencesForm = {

  // By default, access to the subscription choice checkboxes is allowed
  access: true,

  // Initialize by finding optional checkbox parents and unsubscribe checkbox.
  init: function() {
    // Finds elements that contain checkboxes
    this.choices = document.getElementsByClassName('item-inner');
    // Listens to the unsubscription checkbox specifically
    document.getElementById('globalunsub').addEventListener('click', this.disableCheckBoxChoices.bind(this));
  },

  /**
   * Disallow access and deselect choices if unsubscribe from all emails is chosen.
   */
  disableCheckBoxChoices: function (){
    for (let i = 0; i < this.choices.length; i++){
      // Toggle disabled state of the other checkboxes
      this.choices[i].classList.toggle('disabled');

      // Finds elements that contain checkboxes
      this.choice = this.choices[i].getElementsByTagName('input')[0];

      // Disable other checkboxes if access is not allowed, otherwise allow access
      if (this.access){
        this.choice.disabled=true;
        this.choice.checked=false;
      } else {
        this.choice.disabled=false;
      }
    }
    // Invert access to checkboxes
    this.access = !this.access;
  }
}

module.exports = emailCommunicationPreferencesForm;
