console.log("D3 version:", d3.version);  // 检查 D3.js 是否正确加载


document.addEventListener("DOMContentLoaded", function () {

    // 定义流派层级关系
    var genreHierarchy;

    fetch('/static/genres_list.json')
        .then(response => response.json())
        .then(data => {
            genreHierarchy = data;
            console.log("Loaded genreHierarchy:", genreHierarchy);  // 添加调试信息
            fetchDataAndCreateGraph();  // 确保在获取 genreHierarchy 数据后再调用 fetchDataAndCreateGraph
        })
        .catch(error => console.error("Error loading genres_list.json:", error));

    function fetchDataAndCreateGraph() {
        fetch("/api/albums")
            .then(response => response.json())
            .then(data => {
                console.log("Fetched data:", data);  // 调试信息
                // var genreHierarchy = generateGenreHierarchy(data);
                var assignedGenresData = assignGenresToMainCategories(data, genreHierarchy);
                createGraph(assignedGenresData, genreHierarchy);

                // 在图谱和列表加载完成后，绑定点击事件
                bindClickEvents();
            })
            .catch(error => {
                console.error("Error fetching data:", error);  // 调试信息
            });
    }

    function assignGenresToMainCategories(data, genreHierarchy) {
        let normalizedHierarchy = {};
        Object.keys(genreHierarchy).forEach(genre => {
            if (Array.isArray(genreHierarchy[genre])) {
                normalizedHierarchy[genre.toLowerCase()] = genreHierarchy[genre].map(subgenre => subgenre.toLowerCase());
            } else {
                console.warn(`Expected an array for genre ${genre}, but got:`, genreHierarchy[genre]);
            }
        });

        return data.map(album => {
            console.log(`Processing album: ${album.title}`); // 添加调试信息
            console.log(`Original genre value:`, album.genre, `Type:`, typeof album.genre); // 添加调试信息

            let genres;
            if (typeof album.genre === 'string') {
                // genres = album.genre.split(',').map(g => g.trim().toLowerCase());
                genres = album.genre.split(/[,\/]/).map(g => g.trim().toLowerCase());
            } else {
                genres = ['undefined'];
            }

            console.log(`Processed genres:`, genres); // 添加调试信息

            let mainGenresAssigned = [];

            genres.forEach(genre => {
                for (let mainGenre in normalizedHierarchy) {
                    if (normalizedHierarchy[mainGenre].includes(genre) || mainGenre === genre) {
                        mainGenresAssigned.push(mainGenre);
                        break;
                    }
                }
            });

            if (mainGenresAssigned.length === 0) {
                mainGenresAssigned = ['undefined'];
            }

            console.log(`Assigned main genres:`, mainGenresAssigned); // 添加调试信息

            return {
                ...album,
                genre: mainGenresAssigned
            };
        });
    }

    // // 动态生成流派层级函数
    // function generateGenreHierarchy(data) {
    //     var genreHierarchy = {};
    //     data.forEach(album => {
    //         var genres = album.genre ? album.genre.split(',').map(g => g.trim()) : ['undefined'];
    //         genres.forEach(genre => {
    //             if (!genreHierarchy[genre]) {
    //                 genreHierarchy[genre] = [];
    //             }
    //         });
    //     });
    //     return genreHierarchy;
    // }

    function createGraph(data, genreHierarchy) {

        // Initialize svg
        var legendWidth = 150;  // 图例的宽度
        var width = document.getElementById('graph').clientWidth;
        var height = document.getElementById('graph').clientHeight;
        var zoom = d3.zoom()
            .scaleExtent([1, 2])  // 设置缩放区间
            .on("zoom", function (event) {
                var transform = event.transform;
                // 限制平移范围
                var translateX = Math.min(0, Math.max(transform.x, width - width * transform.k));
                var translateY = Math.min(0, Math.max(transform.y, height - height * transform.k));
                svg.attr("transform", `translate(${translateX}, ${translateY}) scale(${transform.k})`);
            });
        var svg = d3.select("#graph").append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)  // 确保SVG视图框与父容器匹配
            .call(zoom)
            .append("g");
        // 添加边界矩形
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 0.5);  // 设置边界的颜色和宽度
        console.log("SVG container created:", svg);  // 调试信息

        var color = d3.scaleOrdinal(d3.schemeCategory10);
        var { nodes, links, genreMap } = elements_gen(data, width, height, legendWidth);
        console.log("Final nodes:", nodes); // 调试信息
        console.log("Final links:", links); // 调试信息

        // create_hier_nodes(genreHierarchy, nodes, links, genreMap);
        nodes_pos_init(nodes, width, height, links);



        //设置图例
        setupLegend(svg, genreHierarchy, color, data);
        var label = svg.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(nodes)
            .enter().append("text")
            .attr("dy", d => d.artist === '' ? 15 : 3)  // 根据是否是流派节点调整位置
            .attr("dx", 7)
            .attr("font-size", "10px")
            .attr("fill", "white")
            .text(d => d.id);

        var simulation = setupForceSimulation(nodes, links, width, height, legendWidth, label);  // 调用 setupForceSimulation
        node = create_nodes(svg, nodes, simulation);
        link = create_links(svg, links);

        node.append("title")
            .text(d => `${d.id} by ${d.artist}\nGenres: ${d.genre.join(', ')}`);

        // 默认上来显示全部颜色，去掉默认无颜色
        // FIXME:
        // node.attr("fill", d => getColor(d.genre[0], genreHierarchy, colorMap));

        console.log("Legend added");  // 调试信息
    }

    function bindClickEvents() {
        console.log("Binding click events to album items...");  // 调试信息

        document.querySelectorAll('.album-item').forEach(item => {
            item.addEventListener('click', function () {
                const albumText = this.textContent.trim();  // 获取被点击的专辑名称

                // 分割文本内容，获取专辑标题部分
                const albumTitle = albumText.split(' - ')[1];  // 获取 ' - ' 之后的部分，即专辑标题

                // 找到图谱中对应的专辑节点
                const selectedNode = d3.selectAll('.nodes circle')
                    .filter(d => d.id === albumTitle);

                if (selectedNode.size() > 0) {
                    // 获取节点的流派并找到对应的颜色
                    const genre = selectedNode.datum().genre[0];  // 假设 genre 是一个数组，获取第一个流派
                    const genreColor = getColor(genre, genreHierarchy, colorMap);

                    // 先将所有 clicked 的节点恢复到默认状态
                    d3.selectAll('.nodes circle.clicked')
                        .classed('clicked', false)  // 移除 clicked 类
                        .transition().duration(300)
                        // .attr('fill', function (d) {
                        //     return getColor(d.genre[0], genreHierarchy, colorMap);
                        // })  // 恢复为默认颜色
                        .attr('fill', "#d3d3d3")
                        .attr('r', function (d) {
                            return d.artist === "" ? getNodeRadius(d) : 5;  // 根据节点类型恢复默认大小
                        });

                    // 将所有与点击节点相关联的链接恢复默认颜色
                    d3.selectAll('.links line.clicked')
                        .classed('clicked', false)  // 移除 clicked 类
                        .transition().duration(300)
                        .attr('stroke', '#999')  // 恢复链接的默认颜色
                        .attr('stroke-width', '1.5px');  // 恢复链接的默认宽度

                    // 高亮当前选中的节点并标记为 clicked
                    selectedNode
                        .classed('clicked', true)  // 添加 clicked 类
                        .transition().duration(300)
                        .attr('fill', genreColor)  // 设置高亮颜色为流派颜色
                        .attr('r', d => d3.max([10, d.r + 3]));  // 增加节点半径

                    // 高亮当前节点相关联的链接并标记为 clicked
                    d3.selectAll('.links line')
                        .filter(function (l) {
                            return l.source.id === albumTitle || l.target.id === albumTitle;
                        })
                        .classed('clicked', true)
                        .transition().duration(300)
                        .attr('stroke', genreColor)  // 将链接高亮为节点流派的颜色
                        .attr('stroke-width', '2px');  // 增加链接宽度以表示高亮
                } else {
                    console.warn("No matching node found for:", albumTitle);  // 调试信息
                }
            });
        });
    }

    // 将函数绑定到全局 window 对象上，使其在其他文件中可访问
    window.bindClickEvents = bindClickEvents;

    //声明元素
    function elements_gen(data, width, height, legendWidth) {
        var nodes = [];
        var links = [];
        var genreMap = {};
        var genreCounts = {};  //计数器

        // 解析专辑数据，处理多个流派
        data.forEach(album => {
            var genres = album.genre ? album.genre : ['undefined']; // 直接使用 album.genre，因为它已经是数组

            nodes.push({ id: album.title, genre: genres, artist: album.artist, connectedLinks: 0, x: legendWidth + Math.random() * (width - legendWidth), y: Math.random() * height });
            console.log("Added album node:", album.title);  // 调试信息

            genres.forEach(genre => {
                if (!genreMap[genre]) {
                    genreMap[genre] = { id: genre, genre: [genre], artist: '', connectedLinks: 0, x: legendWidth + Math.random() * (width - legendWidth), y: Math.random() * height };
                    nodes.push(genreMap[genre]);
                    console.log("Added genre node:", genre);  // 调试信息
                }
                links.push({ source: genreMap[genre], target: album.title });
                genreMap[genre].connectedLinks++;
                console.log("Added link:", { source: genre, target: album.title });  // 调试信息
            });
        });

        // 添加主流派节点
        Object.keys(genreHierarchy).forEach(mainGenre => {
            var lowerCaseGenre = mainGenre.toLowerCase();
            if (genreMap[lowerCaseGenre] && genreMap[lowerCaseGenre].connectedLinks > 0) {
                nodes.push(genreMap[lowerCaseGenre]);
                console.log("Added main genre node:", mainGenre);  // 调试信息
            }
        });

        console.log("Final nodes:", nodes); // 调试信息
        console.log("Final links:", links); // 调试信息


        return { nodes, links, genreMap };  // 返回值
    }


    // 创建流派层级节点和连接
    function create_hier_nodes(genreHierarchy, nodes, links, genreMap) {
        for (var parentGenre in genreHierarchy) {
            if (!genreMap[parentGenre]) {
                genreMap[parentGenre] = { id: parentGenre, genre: [parentGenre], artist: '', connectedLinks: 0 };
                nodes.push(genreMap[parentGenre]);
                console.log("Added parent genre node:", parentGenre);  // 调试信息
            }

            genreHierarchy[parentGenre].forEach(subGenre => {
                if (!genreMap[subGenre]) {
                    genreMap[subGenre] = { id: subGenre, genre: [subGenre], artist: '', connectedLinks: 0 };
                    nodes.push(genreMap[subGenre]);
                    console.log("Added sub-genre node:", subGenre);  // 调试信息
                }
                // 添加父流派与子流派之间的链接
                links.push({ source: parentGenre, target: subGenre });
                genreMap[parentGenre].connectedLinks++;
                genreMap[subGenre].connectedLinks++;
                console.log("Added hierarchical link:", { source: parentGenre, target: subGenre });  // 调试信息
            });
        }

        console.log("Final nodes:", nodes);  // 调试信息
        console.log("Final links:", links);  // 调试信息
    }

    // 初始化节点位置
    function nodes_pos_init(nodes, width, height, links) {
        nodes.forEach(node => {
            node.x = width / 2 + Math.random() * 100 - 50;
            node.y = height / 2 + Math.random() * 100 - 50;
        });

        console.log("Final nodes:", nodes);  // 调试信息
        console.log("Final links:", links);  // 调试信息
    }

    // 在力仿真之前，固定 'Sound' 节点的位置
    function setupForceSimulation(nodes, links, width, height, legendWidth, label) {
        var simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))  // 增加距离
            .force("charge", d3.forceManyBody().strength(-30))  // 减少斥力
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => getNodeRadius(d) + 10));  // 增加碰撞半径

        simulation.on("tick", () => {
            nodes.forEach(d => {
                d.x = Math.max(getNodeRadius(d), Math.min(width - getNodeRadius(d), d.x));
                d.y = Math.max(getNodeRadius(d), Math.min(height - getNodeRadius(d), d.y));
            });

            link
                .attr("x1", d => {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var offsetX = (dx / dist) * getNodeRadius(d.source);
                    return Math.max(d.source.x, legendWidth) + offsetX;
                })
                .attr("y1", d => {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var offsetY = (dy / dist) * getNodeRadius(d.source);
                    return d.source.y + offsetY;
                })
                .attr("x2", d => {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var offsetX = (dx / dist) * getNodeRadius(d.target);
                    return Math.max(d.target.x, legendWidth) - offsetX;
                })
                .attr("y2", d => {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var offsetY = (dy / dist) * getNodeRadius(d.target);
                    return d.target.y - offsetY;
                });

            node
                .attr("cx", d => Math.max(d.x, legendWidth))
                .attr("cy", d => d.y);

            label
                .attr("x", d => Math.max(d.x, legendWidth))
                .attr("y", d => d.y);
        });


        return simulation;
    }

    // 函数用于根据连接数设置节点的大小
    function getNodeRadius(d) {
        if (d.artist === '') { // 流派节点
            return 10 + d.connectedLinks * 2; // 基本大小为10，随着连接数增加
        } else { // 专辑节点
            return 5; // 固定大小为5
        }
    }



    function generateColorScheme(parentColor) {
        return d3.scaleSequential(d3.interpolateRdYlBu).domain([0, 1]);
    }

    var colorMap = {};
    //颜色生成函数

    /**
 * 为给定的流派生成并返回颜色。
 * 
 * @param {string} genre - 流派名称
 * @param {Object} genreHierarchy - 流派层级结构对象
 * @param {Object} colorMap - 已生成颜色的映射对象
 * @returns {string} - 生成的颜色
 */
    function getColor(genre, genreHierarchy, colorMap) {
        if (!genre) {
            console.error("Undefined genre detected");
            return '#d3d3d3'; // 返回默认颜色，避免错误
        }

        if (!colorMap[genre]) {
            var parentGenre = Object.keys(genreHierarchy).find(parent => genreHierarchy[parent].includes(genre) || parent.toLowerCase() === genre.toLowerCase());
            console.log(`Finding parent for genre: ${genre}, found parent: ${parentGenre}`);  // 添加调试信息

            if (parentGenre) {
                if (!colorMap[parentGenre]) {
                    // 使用D3的颜色方案生成颜色
                    const colorScheme = d3.scaleOrdinal(d3.schemeSet3);
                    const genreList = [
                        'Pop', 'Electronic', 'Hip Hop', 'R&B', 'Latin', 'Rock', 'Metal',
                        'Country', 'Folk/Acoustic', 'Classical', 'Jazz', 'Blues',
                        'Easy listening', 'New age', 'World Music', 'Undefined'
                    ];

                    genreList.forEach((g, index) => {
                        colorMap[g.toLowerCase()] = colorScheme(index);
                    });
                }
                colorMap[genre] = colorMap[parentGenre.toLowerCase()];
            } else {
                console.warn(`Parent genre not found for: ${genre}, using default color scheme`);  // 添加警告信息
                colorMap[genre] = '#d3d3d3'; // 默认颜色
            }
        }
        return colorMap[genre];
    }



    /**
     * 为给定的父颜色生成一个颜色比例尺。
     * 
     * @param {string} parentColor - 父颜色
     * @returns {function} - 颜色比例尺函数
     */
    function generateColorScheme(baseColor) {
        // 定义插值器
        return d3.scaleSequential(d3.interpolateHcl(baseColor, d3.hcl(baseColor).brighter(2)))
            .domain([0, 1]);
    }


    // 添加图例
    function setupLegend(svg, genreHierarchy, color, data) {
        var legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(10, 10)");  // 在左上角 10px 的位置开始图例

        var mainGenresInData = new Set();
        data.forEach(album => {
            if (Array.isArray(album.genre)) {
                album.genre.forEach(genre => mainGenresInData.add(genre));
            } else if (typeof album.genre === 'string') {
                album.genre.split(/[,\/]/).forEach(genre => mainGenresInData.add(genre.trim().toLowerCase()));
            } else {
                console.warn(`Unexpected genre format for album: ${album.title}`, album.genre);
            }
        });

        const mainGenresArray = Array.from(mainGenresInData);

        updateLegend(legend, genreHierarchy, color, mainGenresArray);

        function updateLegend(legend, genreHierarchy, color, mainGenresInData) {
            legend.selectAll("*").remove();  // 清除之前的图例内容

            mainGenresInData.forEach((genre, i) => {
                console.log(`Genre: ${genre}, Index: ${i}`);  // 添加调试信息
                if (isNaN(i)) {
                    console.error(`Index is NaN for genre: ${genre}`);
                }

                var legendRow = legend.append("g")
                    .attr("transform", `translate(0, ${i * 20})`)
                    .attr("class", `legend-row legend-${genre}`)
                    .style("cursor", "pointer")  // 将鼠标指针设置为指针
                    .on("mouseover", function () {
                        d3.select(this).select(".background-rect").transition().duration(150)
                        // .attr("fill", "rgba(240, 240, 240, 0.2)");  // 设置为透明高亮背景
                        d3.select(this).select(".legend-color-rect").transition().duration(150)
                            .attr("fill", d3.rgb(getColor(genre, genreHierarchy, colorMap)).darker(0.5));  // 使颜色稍微变暗
                        d3.select(this).select("text").transition().duration(150)
                            .attr("fill", d3.rgb(getColor(genre, genreHierarchy, colorMap)).darker(0.5));  // 更改文字颜色
                    })
                    .on("mouseout", function () {
                        d3.select(this).select(".background-rect").transition().duration(150)
                            .attr("fill", "none");  // 恢复无背景色
                        d3.select(this).select(".legend-color-rect").transition().duration(150)
                            .attr("fill", getColor(genre, genreHierarchy, colorMap));  // 恢复原始颜色
                        d3.select(this).select("text").transition().duration(150)
                            .attr("fill", "white");  // 恢复文字颜色
                    })
                    .on("click", function (event) {
                        event.stopPropagation();
                        //TODO:

                        // d3.interrupt(this);  // 打断可能正在进行的动画

                        // // 同步放大图例方块和文字
                        // d3.select(this).selectAll(".legend-color-rect, text").transition()
                        //     .duration(150)
                        //     .attr("transform", "scale(0.9)")
                        //     .on("end", function () {
                        //         d3.select(this).transition()
                        //             .duration(80)
                        //             .attr("transform", "scale(1)");
                        //     });
                        highlightNodesAndLinks(genre);
                    });


                legendRow.append("rect")
                    .attr("class", "background-rect")
                    .attr("x", 0)
                    .attr("y", 2)
                    .attr("width", 120)  // 你可以根据需要调整宽度
                    .attr("height", 15)  // 高度需要与字体大小匹配
                    .attr("fill", "none");  // 初始状态无背景色

                legendRow.append("rect")
                    .attr("class", "legend-color-rect")
                    .attr("x", 5)
                    .attr("y", 5)  // 图例方块的 y 坐标，使其居中对齐
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", getColor(genre, genreHierarchy, colorMap));

                legendRow.append("text")
                    .attr("x", 25)
                    .attr("y", 13)
                    .attr("fill", "white")
                    .attr("font-size", "10px")
                    .attr("font-weight", "bold")  // 设置文字加粗
                    .text(genre);
            });

            function highlightNodesAndLinks(genre) {
                // 先移除所有 clicked 类
                node.classed("clicked", false).transition().duration(300)
                    .attr("fill", '#d3d3d3')
                    .attr('r', function (d) {
                        return d.artist === "" ? getNodeRadius(d) : 5;  // 根据节点类型恢复默认大小
                    });
                link.classed("clicked", false).transition().duration(300)
                    .attr("stroke", '#d3d3d3')
                    .attr('stroke-width', '1.5px');  // 恢复链接的默认宽度;

                // 高亮显示相关的流派节点
                node.filter(d => d.id === genre && d.artist === '')
                    .classed("clicked", true).transition().duration(300)
                    .attr("fill", getColor(genre, genreHierarchy, colorMap));

                // 高亮显示相关的专辑节点
                node.filter(d => d.genre.includes(genre) && d.artist !== '')
                    .classed("clicked", true).transition().duration(300)
                    .attr("fill", getColor(genre, genreHierarchy, colorMap))
                    .attr('r', d => d3.max([10, d.r + 3]));  // 增加节点半径

                // 高亮显示与流派相关的链接

                link.filter(d => (d.source.id === genre && d.target.genre.includes(genre) && d.target.artist !== '') ||
                    (d.target.id === genre && d.source.genre.includes(genre) && d.source.artist !== ''))
                    .classed("clicked", true).transition().duration(300)
                    .attr('stroke-width', '2px') // 增加链接宽度以表示高亮
                    .attr("stroke", getColor(genre, genreHierarchy, colorMap));
            }

        }

        // Not using
        // function toggleChildren(parentGenre, legend, genreHierarchy, color) {
        //     var isExpanded = legend.selectAll(`.child-legend-${parentGenre}`).size() > 0;

        //     // 先收回所有子流派
        //     legend.selectAll(".child-legend").remove();

        //     if (isExpanded) {
        //         // 收起子流派
        //         legend.selectAll(`.child-legend-${parentGenre}`).remove();
        //         // 恢复所有节点和线为淡灰色
        //         node.attr("fill", d => d.artist === '' ? '#d3d3d3' : getColor(d.genre[0], genreHierarchy, colorMap));
        //         link.attr("stroke", d => d.source.artist === '' ? '#d3d3d3' : getColor(d.source.genre ? d.source.genre[0] : d.source, genreHierarchy, colorMap));
        //     } else {
        //         // 再展开/收起当前子流派
        //         var children = genreHierarchy[parentGenre];
        //         // 展开子流派
        //         children.forEach((subGenre, i) => {
        //             var childLegendRow = legend.append("g")
        //                 .attr("transform", `translate(20, ${(Object.keys(genreHierarchy).indexOf(parentGenre) * 20 + (i + 1) * 20)})`)
        //                 .attr("class", `child-legend child-legend-${parentGenre}`)
        //                 .on("click", function (event) {
        //                     event.stopPropagation();
        //                     highlightNodesAndLinks(subGenre);
        //                 });

        //             childLegendRow.append("rect")
        //                 .attr("width", 10)
        //                 .attr("height", 10)
        //                 .attr("fill", getColor(subGenre, genreHierarchy, colorMap));

        //             childLegendRow.append("text")
        //                 .attr("x", 20)
        //                 .attr("y", 10)
        //                 .attr("fill", "white")
        //                 .attr("font-size", "10px")
        //                 .text(subGenre);
        //         });
        //         // 高亮显示相关的节点和链接
        //         highlightNodesAndLinks(parentGenre);
        //     }

        //     // 重新调整图例位置，避免重叠
        //     adjustLegendPosition(legend, genreHierarchy);
        // }

        // 在 adjustLegendPosition 函数中，确保子流派的位置保持在父流派的右边
        function adjustLegendPosition(legend, genreHierarchy) {
            var genres = Object.keys(genreHierarchy);

            genres.forEach((parentGenre, i) => {
                legend.select(`.parent-${parentGenre}`)
                    .attr("transform", `translate(0, ${i * 20})`);

                legend.selectAll(`.child-legend-${parentGenre}`)
                    .attr("transform", (d, j) => `translate(20, ${(i * 20 + (j + 1) * 20)})`);
            });
        }
    }

    // 全局变量，跟踪拖拽状态
    let isDraggingNode = false;
    // 生成节点
    function create_nodes(svg, nodes, simulation) {
        var node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", d => getNodeRadius(d)) // 使用自定义的半径函数
            .attr("fill", d => {
                var color = '#d3d3d3';
                // console.log('Node color for', d.id, ':', color);
                return color;
            }) // 节点为淡灰色
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("click", click); // 添加点击事件
        return node;

        function dragstarted(event, d) {
            console.log("Drag started:", d.id);  // 调试信息
            if (!event.active) simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            isDraggingNode = true; // 开始拖拽
            console.log("Dragging:", d.id);  // 调试信息
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            isDraggingNode = false; // 结束拖拽
            console.log("Drag ended:", d.id);  // 调试信息
            if (!event.active) simulation.alphaTarget(0.1);
            d.fx = null;
            d.fy = null;
        }

        // 使用更多的阻尼来减少运动
        simulation.velocityDecay(0.9);

        function mouseover(event, d) {
            if (!isDraggingNode && !d3.select(this).classed("clicked")) {
                d3.select(this).transition()
                    .duration(150)
                    .attr("r", getNodeRadius(d) + 3);
                if (d.artist === '' && !d3.select(this).classed("clicked")) { // 检查是否已经被点击
                    if (d.artist === '') {
                        d3.select(this).transition()
                            .duration(150)
                            .attr("r", getNodeRadius(d) + 3)
                            .attr("fill", getColor(d.genre[0], genreHierarchy, colorMap));  // 确保鼠标悬停时颜色正确
                        node.filter(n => n.genre.includes(d.id))
                            .attr("fill", getColor(d.genre[0], genreHierarchy, colorMap));
                        link.filter(l => (l.source.id === d.id || l.target.id === d.id) && l.target.artist !== '')
                            .attr("stroke", d => getColor(d.source.genre ? d.source.genre[0] : d.source, genreHierarchy, colorMap));
                    }
                }
            }

        }

        function mouseout(event, d) {
            if (!isDraggingNode && !d3.select(this).classed("clicked")) {
                d3.select(this).transition()
                    .duration(150)
                    .attr("r", getNodeRadius(d))
                if (d.artist === '') {
                    d3.select(this).transition()
                        .duration(150)
                        .attr("r", getNodeRadius(d))
                        .attr("fill", (d3.select(this).classed("clicked")) ? getColor(d.genre[0], genreHierarchy, colorMap) : '#d3d3d3');  // 确保鼠标移开时颜色正确
                    node.filter(n => n.genre.includes(d.id))
                        .attr("fill", (d3.select(this).classed("clicked")) ? getColor(d.genre[0], genreHierarchy, colorMap) : '#d3d3d3');  // 确保鼠标移开时颜色正确
                    link.filter(l => (l.source.id === d.id || l.target.id === d.id) && l.target.artist !== '')
                        .attr("stroke", (d3.select(this).classed("clicked")) ? getColor(d.genre[0], genreHierarchy, colorMap) : '#d3d3d3');
                }
            }

        }


        function click(event, d) {
            const isClicked = d3.select(this).classed("clicked");
            console.log("Clicked node album:", d.id, "Clicked node artist:", d.artist);
            console.log("Clicked node genre:", d.genre, "Clicked node class:", isClicked);  // 打印节点的 genre 属性
            if (isDraggingNode) { }
            else {
                // 如果节点已经被点击，则移除其 "clicked" 类，并恢复默认样式
                if (isClicked) {
                    d3.select(this).classed("clicked", false).transition().duration(300)
                        .attr("fill", '#d3d3d3')
                        .attr('r', function (d) {
                            return d.artist === "" ? getNodeRadius(d) : 5;  // 根据节点类型恢复默认大小
                        });

                    // 恢复相关的节点和链接样式
                    node.filter(n => n.genre.includes(d.id)).classed("clicked", false).transition().duration(300)
                        .attr("fill", '#d3d3d3')
                        .attr('r', function (d) {
                            return d.artist === "" ? getNodeRadius(d) : 5;  // 根据节点类型恢复默认大小
                        });
                    link.filter(l => l.source.id === d.id || l.target.id === d.id).classed("clicked", false).transition().duration(300)
                        .attr("stroke", '#d3d3d3')
                        .attr('stroke-width', '1.5px');  // 恢复链接的默认宽度;

                } else {
                    // Remove all clicked attr for all nodes and links
                    node.classed("clicked", false)
                        .transition().duration(300)
                        .attr("fill", '#d3d3d3')
                        .attr('r', function (d) {
                            return d.artist === "" ? getNodeRadius(d) : 5;  // 根据节点类型恢复默认大小
                        });
                    link.classed("clicked", false)
                        .transition().duration(300)
                        .attr("stroke", '#d3d3d3')
                        .attr('stroke-width', '1.5px');

                    d3.select(this)
                        .classed("clicked", true)
                        .transition().duration(300)
                        .attr("fill", getColor(d.genre[0], genreHierarchy, colorMap));

                    if (d.artist === '') { // 流派节点
                        node.filter(n => n.genre.includes(d.id))
                            .classed("clicked", true)
                            .transition().duration(300)
                            .attr("fill", getColor(d.genre[0], genreHierarchy, colorMap))
                            .attr('r', function (node) {
                                return node.artist === "" ? getNodeRadius(d) : getNodeRadius(node) + 3;  // 根据节点类型恢复默认大小
                            });

                        link.filter(l => (l.source.id === d.id || l.target.id === d.id) && l.target.artist !== '')
                            .classed("clicked", true) // 相关的链接也添加 "clicked" 类
                            .transition().duration(300)
                            .attr("stroke", getColor(d.genre[0], genreHierarchy, colorMap))
                            .attr('stroke-width', '2px'); // 增加链接宽度以表示高亮

                    } else {
                        d3.select(this).classed("clicked", true)
                            .transition().duration(300)
                            .attr("fill", getColor(d.genre[0], genreHierarchy, colorMap))
                            .attr('r', getNodeRadius(d) + 3);
                    }
                }
            }
            console.log("Clicked node album:", d.id, "Clicked node artist:", d.artist);
            console.log("Clicked node genre:", d.genre, "Clicked node class:", d3.select(this).classed("clicked"));  // 打印节点的 genre 属性
        }

    }
    // 生成连接
    function create_links(svg, links) {
        var link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke-width", 0.5)
            .attr("stroke", d => {
                var color = d.source.artist === '' ? '#d3d3d3' : getColor(d.source.genre ? d.source.genre[0] : d.source);
                // console.log('Link color for', d.source.id, 'to', d.target.id, ':', color);
                return color;
            });
        return link;
    }

});
