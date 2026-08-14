    // Function to open the sidebar
    function toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar.style.width === "250px") {
          sidebar.style.width = "0";
  
        } else {
          sidebar.style.width = "250px";
        }
      }
  
      // Function to close the sidebar
      function closeSidebar() {
        const sidebar = document.getElementById("sidebar");
 
        sidebar.style.width = "0";

      }
      
      // Function to toggle the options menu
      function toggleOptions() {
        const optionsMenu = document.getElementById("optionsMenu");
        optionsMenu.classList.toggle("active-options");
      }

          // Function to open the sidebar
    function toggleSidebar2() {
      const sidebar = document.getElementById("sidebar2");
      if (sidebar.style.width === "250px") {
        sidebar.style.width = "0";

      } else {
        sidebar.style.width = "250px";
      }
    }

    // Function to close the sidebar
    function closeSidebar2() {
      const sidebar = document.getElementById("sidebar2");

      sidebar.style.width = "0";

    }
    
    // Function to toggle the options menu
    function toggleOptions() {
      const optionsMenu = document.getElementById("optionsMenu");
      optionsMenu.classList.toggle("active-options");
    }