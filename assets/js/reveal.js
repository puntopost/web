(function () {
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    document.querySelectorAll('.reveal').forEach(function (el) {
        observer.observe(el);
    });
})();
