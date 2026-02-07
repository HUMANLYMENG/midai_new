
# TODO List

## FIXME

> - ~~Click Legend will lightup too many.~~
> - ~~Mouseover album node will stuck large.~~
> - ~~Click still effects even when you dragging a node but mouse over another node.~~
> - Duplicates album title will not conenct to the genre.

---

## Week 32

- [ ] **Add export button to allow User migrate to other device.**
- [ ] Should we follow Genre-Style method as Discog?
- [ ] Updating Album info methods need more study. Add update button to update album functions.
- [ ] Update graph in realtime, no reload the whole graph.
- [ ] Graph structure design.
- [ ] Graph connection by filter, e.g. tag, label...
- [ ] Search the genres and find parent genre which are not included in genres list.
- [ ] Add filters, e.g. Label, Genre. *(Or show them all and use filter to set un/visible?)*
- [ ] Show colors in the album list when sorting the album list.
- [ ] Set more resonable colors for graph. *Ref: <https://musicmap.info/>*
- [ ] Make graph more prettier.
- [ ] Add more statistical graph? Dashboards? Daily new albums, like Git. In Home page?
- [ ] Add Covers for albums
- [ ] Add more genres into genres list, and if an undefined genres there, how to update?
- [ ] Album covers follows mouse, *Ref: <https://tomrobin.co/>*
- [ ] Logging errors.

## Week 31

- [x] Add remove botton in floating edit window, and dragable now.
- [x] Collect all genre info into graph
- [x] Find a way to build the genre hierarchy? *Generated from <https://www.chosic.com/list-of-music-genres/>*
- [x] Add sorting ~~(Need upload time? useful to timeline)~~. *upload time sorting is default*
- [x] Add mouse over effect on album list and legend.
- [x] Build a init database: User only need to upload csv *(maybe more formats)* file.
- [x] Floating navigate bar.
- [x] Need filter out duplicates. *duplicates are filtered on sql level now, but need logging*

## Already Done

- [x] Upload csv album lists
- [x] Import album information manually
- [x] Show Visual Graph of album genre relations
- [x] Click Legend, Genres can light up related albums. Click album can light up the album
- [x] Album can be edited in a floating window
- [x] Album list are shown in sidebar and can be folded
